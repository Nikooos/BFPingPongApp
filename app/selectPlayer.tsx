import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  SectionList,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { IconSymbol } from "@/components/ui/IconSymbol";

type Player = {
  name: string;
  rating: number;
  isRetired?: boolean;
};

type PlayerSection = {
  title: string;
  data: Player[];
};

export default function SelectPlayerScreen() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [showRetired, setShowRetired] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const router = useRouter();
  const navigation = useNavigation();
  const { team, index, usedPlayers } = useLocalSearchParams();

  useEffect(() => {
    navigation.setOptions({
      title: "Select Player",
      headerStyle: {
        backgroundColor: "#FE7000",
      },
      headerTintColor: "#fff",
      headerTitleStyle: {
        fontWeight: "600",
      },
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={{ marginRight: 15 }}
        >
          <IconSymbol size={28} name="plus" color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      const stored = await AsyncStorage.getItem("players");
      if (stored) {
        const parsed: Player[] = JSON.parse(stored);
        setPlayers(parsed.sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch (err) {
      console.error("Error loading players", err);
    }
  };

  const savePlayers = async (playersToSave: Player[]) => {
    await AsyncStorage.setItem("players", JSON.stringify(playersToSave));
  };

  const handleAddPlayer = async () => {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst || !trimmedLast) {
      Alert.alert("Error", "Please enter both first and last name.");
      return;
    }
    const fullName = `${trimmedFirst} ${trimmedLast}`;
    const exists = players.some(
      (p) => p.name.toLowerCase() === fullName.toLowerCase()
    );
    if (exists) {
      Alert.alert("Error", "Player already exists.");
      return;
    }
    const newPlayer: Player = {
      name: fullName,
      rating: 1500,
      isRetired: false,
    };
    const updatedPlayers = [...players, newPlayer].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    setPlayers(updatedPlayers);
    await savePlayers(updatedPlayers);
    setFirstName("");
    setLastName("");
    setModalVisible(false);

    // Auto-select the newly added player
    selectPlayer(newPlayer);
  };

  const getAvailablePlayers = (): Player[] => {
    if (!usedPlayers) return players;

    try {
      const used = Array.isArray(usedPlayers)
        ? usedPlayers
        : JSON.parse(usedPlayers as string);
      return players.filter((player) => !used.includes(player.name));
    } catch (err) {
      console.error("Error parsing used players", err);
      return players;
    }
  };

  const getPlayerSections = (): PlayerSection[] => {
    const availablePlayers = getAvailablePlayers();

    const activePlayers = availablePlayers.filter(
      (player) => !player.isRetired
    );
    const retiredPlayers = availablePlayers.filter(
      (player) => player.isRetired
    );

    const sections: PlayerSection[] = [];

    if (activePlayers.length > 0) {
      sections.push({
        title: "Active Players",
        data: activePlayers,
      });
    }

    if (showRetired && retiredPlayers.length > 0) {
      sections.push({
        title: "Retired Players",
        data: retiredPlayers,
      });
    }

    return sections;
  };

  const selectPlayer = async (player: Player) => {
    try {
      // Store the selection temporarily in AsyncStorage
      const selectionData = {
        playerName: player.name,
        team: team as string,
        index: parseInt(index as string),
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(
        "selectedPlayer",
        JSON.stringify(selectionData)
      );

      // Navigate back
      router.back();
    } catch (err) {
      console.error("Error storing selected player", err);
    }
  };

  const renderPlayer = ({ item }: { item: Player }) => (
    <TouchableOpacity
      style={[styles.playerItem, item.isRetired && styles.retiredPlayerItem]}
      onPress={() => selectPlayer(item)}
    >
      <View style={styles.playerInfo}>
        <View style={styles.playerNameRow}>
          <Text
            style={[
              styles.playerName,
              item.isRetired && styles.retiredPlayerName,
            ]}
          >
            {item.name}
          </Text>
          {item.isRetired && (
            <View style={styles.retiredBadge}>
              <Text style={styles.retiredBadgeText}>RETIRED</Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.playerRating,
            item.isRetired && styles.retiredPlayerRating,
          ]}
        >
          Rating: {item.rating}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: PlayerSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  const playerSections = getPlayerSections();
  const availablePlayers = getAvailablePlayers();
  const retiredCount = availablePlayers.filter((p) => p.isRetired).length;

  return (
    <View style={styles.container}>
      {/* Retired Players Toggle */}
      {retiredCount > 0 && (
        <View style={styles.toggleContainer}>
          <View style={styles.toggleContent}>
            <Text style={styles.toggleLabel}>
              Show retired players ({retiredCount})
            </Text>
            <Switch
              value={showRetired}
              onValueChange={setShowRetired}
              trackColor={{ false: "#e0e0e0", true: "#FE7000" }}
              thumbColor={showRetired ? "#fff" : "#f4f3f4"}
            />
          </View>
        </View>
      )}

      {playerSections.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No available players</Text>
          <Text style={styles.emptySubtext}>
            All players are already selected or no players exist
          </Text>
          <TouchableOpacity
            style={styles.addPlayerButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addPlayerButtonText}>Add New Player</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={playerSections}
          keyExtractor={(item) => item.name}
          renderItem={renderPlayer}
          renderSectionHeader={renderSectionHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Add Player Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Player</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                placeholder="Enter first name"
                value={firstName}
                onChangeText={setFirstName}
                style={styles.input}
                autoCapitalize="words"
                autoCorrect={false}
                spellCheck={false}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                placeholder="Enter last name"
                value={lastName}
                onChangeText={setLastName}
                style={styles.input}
                autoCapitalize="words"
                autoCorrect={false}
                spellCheck={false}
                returnKeyType="done"
                onSubmitEditing={handleAddPlayer}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setFirstName("");
                  setLastName("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddPlayer}
              >
                <Text style={styles.addButtonText}>Add & Select</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  toggleContainer: {
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  toggleContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  listContainer: {
    paddingBottom: 20,
  },
  sectionHeader: {
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 20,
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginBottom: 20,
  },
  addPlayerButton: {
    backgroundColor: "#FE7000",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addPlayerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  playerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  retiredPlayerItem: {
    backgroundColor: "#f8f8f8",
    opacity: 0.7,
  },
  playerInfo: {
    flex: 1,
  },
  playerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  playerName: {
    fontSize: 18,
    fontWeight: "500",
    color: "#333",
  },
  retiredPlayerName: {
    color: "#666",
  },
  retiredBadge: {
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  retiredBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
  },
  playerRating: {
    fontSize: 14,
    color: "#666",
  },
  retiredPlayerRating: {
    color: "#999",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 10,
    width: "80%",
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
  },
  addButton: {
    flex: 1,
    padding: 12,
    backgroundColor: "#FE7000",
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});
