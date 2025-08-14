import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Dimensions,
  Animated,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { LineChart } from "react-native-chart-kit";
import { IconSymbol } from "@/components/ui/IconSymbol";

type Match = {
  id: string;
  type: "singles" | "doubles";
  players: {
    team1: string[];
    team2: string[];
  };
  sets: { team1: number; team2: number }[];
  score: {
    team1: number;
    team2: number;
  };
  date: string;
  winner: "team1" | "team2";
  ratings?: {
    before: {
      team1: number;
      team2: number;
    };
    after: {
      team1: number;
      team2: number;
    };
    change: {
      winners: number;
      losers: number;
    };
  };
};

type PlayerMatch = {
  match: Match;
  isWin: boolean;
  opponent: string;
  ratingBefore: number;
  ratingAfter: number;
  ratingChange: number;
};

export default function PlayerDetailsScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const [playerMatches, setPlayerMatches] = useState<PlayerMatch[]>([]);
  const [playerStats, setPlayerStats] = useState({
    rating: 1500,
    matches: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    isRetired: false, // Add retirement status
  });
  const [ratingHistory, setRatingHistory] = useState<number[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    navigation.setOptions({
      title: "", // Remove static title
      headerStyle: {
        backgroundColor: "#FE7000",
      },
      headerTintColor: "#fff",
      headerTitleStyle: {
        fontWeight: "600",
      },
      headerBackTitle: "Back",
      // Add animated header title
      headerTitle: () => (
        <Animated.View style={{ opacity: headerOpacity }}>
          <Text style={styles.headerTitle}>{name}</Text>
        </Animated.View>
      ),
      // Add edit button
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            // Split current name into first and last name
            const nameParts = (name || "").split(" ");
            setFirstName(nameParts[0] || "");
            setLastName(nameParts.slice(1).join(" ") || "");
            setEditModalVisible(true);
          }}
          style={styles.editButton}
        >
          <IconSymbol name="pencil" size={20} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, name, headerOpacity]);

  useEffect(() => {
    if (name) {
      loadPlayerData();
    }
  }, [name]);

  // Handle scroll animation (SINGLE FUNCTION - removed duplicate)
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const threshold = 40;

        if (offsetY > threshold) {
          Animated.timing(headerOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.timing(headerOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    }
  );

  const updatePlayerName = async () => {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || !trimmedLast) {
      Alert.alert("Error", "Please enter both first and last name");
      return;
    }

    const newPlayerName = `${trimmedFirst} ${trimmedLast}`;

    if (newPlayerName === name) {
      setEditModalVisible(false);
      return;
    }

    try {
      // Load current data
      const [playersData, matchesData] = await Promise.all([
        AsyncStorage.getItem("players"),
        AsyncStorage.getItem("matches"),
      ]);

      if (!playersData) return;

      const players = JSON.parse(playersData);
      const matches = matchesData ? JSON.parse(matchesData) : [];

      // Check if new name already exists
      const existingPlayer = players.find((p: any) => p.name === newPlayerName);
      if (existingPlayer) {
        Alert.alert("Error", "A player with this name already exists");
        return;
      }

      // Update player name in players array
      const playerIndex = players.findIndex((p: any) => p.name === name);
      if (playerIndex !== -1) {
        players[playerIndex].name = newPlayerName;
      }

      // Update player name in all matches
      const updatedMatches = matches.map((match: any) => {
        const updatedMatch = { ...match };

        // Update team1 players
        if (updatedMatch.players?.team1) {
          updatedMatch.players.team1 = updatedMatch.players.team1.map(
            (playerName: string) =>
              playerName === name ? newPlayerName : playerName
          );
        }

        // Update team2 players
        if (updatedMatch.players?.team2) {
          updatedMatch.players.team2 = updatedMatch.players.team2.map(
            (playerName: string) =>
              playerName === name ? newPlayerName : playerName
          );
        }

        return updatedMatch;
      });

      // Save updated data
      await Promise.all([
        AsyncStorage.setItem("players", JSON.stringify(players)),
        AsyncStorage.setItem("matches", JSON.stringify(updatedMatches)),
      ]);

      // Close modal and navigate back with updated name
      setEditModalVisible(false);

      // Navigate back and then to the updated player details
      router.back();
      setTimeout(() => {
        router.push(`/playerDetail?name=${encodeURIComponent(newPlayerName)}`);
      }, 100);
    } catch (err) {
      console.error("Error updating player name", err);
      Alert.alert("Error", "Failed to update player name");
    }
  };

  const toggleRetirement = async () => {
    const actionText = playerStats.isRetired ? "reactivate" : "retire";
    const confirmText = playerStats.isRetired
      ? "Are you sure you want to reactivate this player? They will appear in rankings again."
      : "Are you sure you want to retire this player? They will be hidden from rankings by default.";

    Alert.alert(
      `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Player`,
      confirmText,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: actionText.charAt(0).toUpperCase() + actionText.slice(1),
          style: playerStats.isRetired ? "default" : "destructive",
          onPress: async () => {
            try {
              const playersData = await AsyncStorage.getItem("players");
              if (!playersData) return;

              const players = JSON.parse(playersData);
              const playerIndex = players.findIndex(
                (p: any) => p.name === name
              );

              if (playerIndex !== -1) {
                players[playerIndex].isRetired = !playerStats.isRetired;
                await AsyncStorage.setItem("players", JSON.stringify(players));

                // Update local state
                setPlayerStats((prev) => ({
                  ...prev,
                  isRetired: !prev.isRetired,
                }));
              }
            } catch (err) {
              console.error("Error updating retirement status", err);
              Alert.alert("Error", "Failed to update player status");
            }
          },
        },
      ]
    );
  };

  const loadPlayerData = async () => {
    try {
      const [playersData, matchesData] = await Promise.all([
        AsyncStorage.getItem("players"),
        AsyncStorage.getItem("matches"),
      ]);

      if (!playersData || !matchesData) return;

      const players = JSON.parse(playersData);
      const matches: Match[] = JSON.parse(matchesData);

      // Find current player
      const currentPlayer = players.find((p: any) => p.name === name);
      if (!currentPlayer) return;

      // Filter matches for this player
      const playerMatches = matches.filter(
        (match) =>
          match.players?.team1?.includes(name!) ||
          match.players?.team2?.includes(name!)
      );

      // Sort by date (oldest first for rating history)
      const sortedMatches = playerMatches.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Build rating history and match details
      const matchHistory: PlayerMatch[] = [];
      const ratingPoints: number[] = [1500]; // Starting rating
      let currentRating = 1500;

      sortedMatches.forEach((match) => {
        const isInTeam1 = match.players?.team1?.includes(name!);
        const isWin =
          (isInTeam1 && match.winner === "team1") ||
          (!isInTeam1 && match.winner === "team2");

        // Get opponent names
        const opponentTeam = isInTeam1
          ? match.players.team2
          : match.players.team1;
        const opponent = opponentTeam.join(" & ");

        let ratingBefore = currentRating;
        let ratingAfter = currentRating;
        let ratingChange = 0;

        if (match.ratings) {
          ratingBefore = isInTeam1
            ? match.ratings.before.team1
            : match.ratings.before.team2;
          ratingAfter = isInTeam1
            ? match.ratings.after.team1
            : match.ratings.after.team2;
          ratingChange = ratingAfter - ratingBefore;
          currentRating = ratingAfter;
          ratingPoints.push(currentRating);
        }

        matchHistory.push({
          match,
          isWin,
          opponent,
          ratingBefore,
          ratingAfter,
          ratingChange,
        });
      });

      // Calculate stats
      const wins = matchHistory.filter((m) => m.isWin).length;
      const losses = matchHistory.length - wins;
      const winRate =
        matchHistory.length > 0 ? (wins / matchHistory.length) * 100 : 0;

      setPlayerStats({
        rating: currentPlayer.rating,
        matches: matchHistory.length,
        wins,
        losses,
        winRate,
        isRetired: currentPlayer.isRetired || false, // Include retirement status
      });

      setPlayerMatches(matchHistory.reverse());
      setRatingHistory(ratingPoints);
    } catch (err) {
      console.error("Error loading player data", err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const renderMatch = ({ item }: { item: PlayerMatch }) => (
    <View style={styles.matchItem}>
      <View style={styles.matchHeader}>
        <View style={styles.matchResult}>
          <Text
            style={[
              styles.resultText,
              item.isWin ? styles.winText : styles.lossText,
            ]}
          >
            {item.isWin ? "WIN" : "LOSS"}
          </Text>
          <Text style={styles.matchType}>{item.match.type.toUpperCase()}</Text>
        </View>
        <Text style={styles.matchDate}>{formatDate(item.match.date)}</Text>
      </View>

      <Text style={styles.opponent}>vs {item.opponent}</Text>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreText}>
          {item.match.score.team1} - {item.match.score.team2}
        </Text>
        <Text
          style={[
            styles.ratingChange,
            item.ratingChange > 0
              ? styles.ratingIncrease
              : styles.ratingDecrease,
          ]}
        >
          {item.ratingChange > 0 ? "+" : ""}
          {item.ratingChange}
        </Text>
      </View>

      <View style={styles.setsScore}>
        {item.match.sets?.map((set, index) => (
          <Text key={index} style={styles.setScore}>
            {set.team1}-{set.team2}
          </Text>
        ))}
      </View>
    </View>
  );

  const screenWidth = Dimensions.get("window").width;

  return (
    <>
      <Animated.ScrollView
        style={styles.container}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Player Stats Header */}
        <View
          style={[styles.header, playerStats.isRetired && styles.retiredHeader]}
        >
          <Animated.View style={styles.playerNameContainer}>
            <View style={styles.playerNameRow}>
              <Text
                style={[
                  styles.playerName,
                  playerStats.isRetired && styles.retiredPlayerName,
                ]}
              >
                {name}
              </Text>
              {playerStats.isRetired && (
                <Text style={styles.retiredBadge}>RETIRED</Text>
              )}
            </View>
          </Animated.View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{playerStats.rating}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{playerStats.matches}</Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{playerStats.wins}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {playerStats.winRate.toFixed(0)}%
              </Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
          </View>

          {/* Retirement Toggle */}
          <TouchableOpacity
            style={[
              styles.retirementButton,
              playerStats.isRetired && styles.reactivateButton,
            ]}
            onPress={toggleRetirement}
          >
            <IconSymbol
              name={
                playerStats.isRetired
                  ? "person.fill.checkmark"
                  : "person.fill.xmark"
              }
              size={16}
              color="#fff"
            />
            <Text style={styles.retirementButtonText}>
              {playerStats.isRetired ? "Reactivate Player" : "Retire Player"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Rating History Graph */}
        {ratingHistory.length > 1 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Rating History</Text>
            <LineChart
              data={{
                labels: Array.from({ length: ratingHistory.length }, (_, i) =>
                  i === 0 ? "Start" : `${i}`
                ),
                datasets: [
                  {
                    data: ratingHistory,
                    strokeWidth: 3,
                    color: (opacity = 1) => `rgba(255, 102, 0, ${opacity})`,
                  },
                ],
              }}
              width={screenWidth - 40}
              height={200}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                  stroke: "#FE7000",
                },
              }}
              style={styles.chart}
            />
          </View>
        )}

        {/* Match History */}
        <View style={styles.matchesContainer}>
          <Text style={styles.sectionTitle}>Match History</Text>
          {playerMatches.length === 0 ? (
            <Text style={styles.emptyText}>No matches played yet</Text>
          ) : (
            <View>
              {playerMatches.map((item) => (
                <View key={item.match.id} style={styles.matchItem}>
                  <View style={styles.matchHeader}>
                    <View style={styles.matchResult}>
                      <Text
                        style={[
                          styles.resultText,
                          item.isWin ? styles.winText : styles.lossText,
                        ]}
                      >
                        {item.isWin ? "WIN" : "LOSS"}
                      </Text>
                      <Text style={styles.matchType}>
                        {item.match.type.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.matchDate}>
                      {formatDate(item.match.date)}
                    </Text>
                  </View>

                  <Text style={styles.opponent}>vs {item.opponent}</Text>

                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreText}>
                      {item.match.score.team1} - {item.match.score.team2}
                    </Text>
                    <Text
                      style={[
                        styles.ratingChange,
                        item.ratingChange > 0
                          ? styles.ratingIncrease
                          : styles.ratingDecrease,
                      ]}
                    >
                      {item.ratingChange > 0 ? "+" : ""}
                      {item.ratingChange}
                    </Text>
                  </View>

                  <View style={styles.setsScore}>
                    {item.match.sets?.map((set, index) => (
                      <Text key={index} style={styles.setScore}>
                        {set.team1}-{set.team2}
                      </Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Edit Player Name Modal */}
      <Modal visible={editModalVisible} animationType="fade" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Player Name</Text>

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
                onSubmitEditing={updatePlayerName}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setEditModalVisible(false);
                  setFirstName("");
                  setLastName("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={updatePlayerName}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  header: {
    backgroundColor: "#FE7000",
    padding: 20,
    paddingTop: 10,
  },
  retiredHeader: {
    backgroundColor: "#999",
  },
  playerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  retiredPlayerName: {
    opacity: 0.8,
  },
  retiredBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 12,
  },
  retirementButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  reactivateButton: {
    backgroundColor: "rgba(76, 175, 80, 0.8)",
  },
  retirementButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  playerNameContainer: {
    marginBottom: 20,
  },
  playerName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
    marginTop: 4,
  },
  chartContainer: {
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },
  chart: {
    borderRadius: 16,
  },
  matchesContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
  matchItem: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#FE7000",
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  matchResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  resultText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  winText: {
    color: "#4CAF50",
  },
  lossText: {
    color: "#F44336",
  },
  matchType: {
    fontSize: 12,
    color: "#666",
    textTransform: "uppercase",
  },
  matchDate: {
    fontSize: 12,
    color: "#666",
  },
  opponent: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  ratingChange: {
    fontSize: 16,
    fontWeight: "600",
  },
  ratingIncrease: {
    color: "#4CAF50",
  },
  ratingDecrease: {
    color: "#F44336",
  },
  setsScore: {
    flexDirection: "row",
    gap: 8,
  },
  setScore: {
    fontSize: 12,
    color: "#666",
    backgroundColor: "#fff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  // Modal styles
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
  saveButton: {
    flex: 1,
    padding: 12,
    backgroundColor: "#FE7000",
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});
