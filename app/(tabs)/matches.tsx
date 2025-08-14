import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
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

export default function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    navigation.setOptions({
      title: "Matches",
      headerStyle: {
        backgroundColor: "#FE7000",
      },
      headerTintColor: "#fff",
      headerTitleStyle: {
        fontWeight: "600",
      },
      headerRight: () => (
        <TouchableOpacity
          onPress={() => router.push("/addMatch")}
          style={{ marginRight: 15 }}
        >
          <IconSymbol size={28} name="plus" color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, router]);

  useFocusEffect(
    React.useCallback(() => {
      loadMatches();
    }, [])
  );

  const loadMatches = async () => {
    try {
      const stored = await AsyncStorage.getItem("matches");
      if (stored) {
        const parsed: any[] = JSON.parse(stored);

        // Migrate old data format to new format
        const migratedMatches: Match[] = parsed.map((match) => {
          // Handle old format where sets might be a number instead of array
          let sets = match.sets;
          if (typeof sets === "number" || !Array.isArray(sets)) {
            // Create dummy sets data for old matches
            sets = [];
            for (let i = 0; i < (sets || 1); i++) {
              sets.push({ team1: 11, team2: 0 }); // Placeholder data
            }
          }

          return {
            ...match,
            sets: sets || [], // Ensure sets is always an array
            players: match.players || { team1: [], team2: [] }, // Ensure players exist
          };
        });

        setMatches(
          migratedMatches.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
        );
      }
    } catch (err) {
      console.error("Error loading matches", err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const deleteMatch = async (matchId: string) => {
    Alert.alert(
      "Delete Match",
      "Are you sure you want to delete this match? This will also revert the rating changes.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Find the match to delete
              const matchToDelete = matches.find((m) => m.id === matchId);
              if (!matchToDelete) return;

              // Revert rating changes if the match has rating data
              if (matchToDelete.ratings) {
                await revertRatingChanges(matchToDelete);
              }

              // Remove match from storage
              const stored = await AsyncStorage.getItem("matches");
              if (stored) {
                const allMatches = JSON.parse(stored);
                const updatedMatches = allMatches.filter(
                  (m: Match) => m.id !== matchId
                );
                await AsyncStorage.setItem(
                  "matches",
                  JSON.stringify(updatedMatches)
                );

                // Update local state
                setMatches(
                  updatedMatches.sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                  )
                );
              }
            } catch (err) {
              console.error("Error deleting match", err);
              Alert.alert("Error", "Failed to delete match");
            }
          },
        },
      ]
    );
  };

  const revertRatingChanges = async (match: Match) => {
    try {
      const storedPlayers = await AsyncStorage.getItem("players");
      if (!storedPlayers || !match.ratings) return;

      const players = JSON.parse(storedPlayers);
      const isTeam1Winner = match.winner === "team1";

      // Get player names
      const winners = isTeam1Winner ? match.players.team1 : match.players.team2;
      const losers = isTeam1Winner ? match.players.team2 : match.players.team1;

      // Revert winner ratings
      winners.forEach((playerName) => {
        const playerIndex = players.findIndex(
          (p: any) => p.name === playerName
        );
        if (playerIndex !== -1) {
          players[playerIndex].rating -= match.ratings!.change.winners;
          players[playerIndex].rating = Math.max(
            players[playerIndex].rating,
            100
          );
        }
      });

      // Revert loser ratings
      losers.forEach((playerName) => {
        const playerIndex = players.findIndex(
          (p: any) => p.name === playerName
        );
        if (playerIndex !== -1) {
          players[playerIndex].rating -= match.ratings!.change.losers; // This is negative, so subtracting adds back
          players[playerIndex].rating = Math.max(
            players[playerIndex].rating,
            100
          );
        }
      });

      await AsyncStorage.setItem("players", JSON.stringify(players));
    } catch (err) {
      console.error("Error reverting ratings", err);
    }
  };

  const renderMatch = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={styles.matchItem}
      onLongPress={() => deleteMatch(item.id)}
      delayLongPress={800} // 800ms long press
      activeOpacity={0.7}
    >
      <View style={styles.matchHeader}>
        <Text style={styles.matchType}>{item.type.toUpperCase()}</Text>
        <Text style={styles.matchDate}>{formatDate(item.date)}</Text>
      </View>

      <View style={styles.matchPlayers}>
        <Text style={styles.teamText}>
          {item.players?.team1?.join(" & ") || "Team 1"}
        </Text>
        <Text style={styles.vsText}>vs</Text>
        <Text style={styles.teamText}>
          {item.players?.team2?.join(" & ") || "Team 2"}
        </Text>
      </View>

      <View style={styles.matchScore}>
        <Text
          style={[
            styles.scoreText,
            item.winner === "team1" && styles.winnerScore,
          ]}
        >
          {item.score?.team1 || 0}
        </Text>
        <Text style={styles.scoreSeparator}>-</Text>
        <Text
          style={[
            styles.scoreText,
            item.winner === "team2" && styles.winnerScore,
          ]}
        >
          {item.score?.team2 || 0}
        </Text>
      </View>

      {/* Rating changes */}
      {item.ratings && (
        <View style={styles.ratingChanges}>
          <Text style={styles.ratingText}>
            Rating: +{item.ratings.change.winners} /{" "}
            {item.ratings.change.losers}
          </Text>
        </View>
      )}

      {item.sets && item.sets.length > 0 && (
        <View style={styles.setsScore}>
          {item.sets.map((set, index) => (
            <Text key={index} style={styles.setScore}>
              {set?.team1 || 0}-{set?.team2 || 0}
            </Text>
          ))}
        </View>
      )}

      {/* Visual hint for long press */}
      <View style={styles.longPressHint}>
        <Text style={styles.hintText}>Long press to delete</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {matches.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No matches yet</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/addMatch")}
          >
            <Text style={styles.addButtonText}>Add First Match</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={renderMatch}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    marginBottom: 20,
    textAlign: "center",
  },
  addButton: {
    backgroundColor: "#FE7000",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  matchItem: {
    backgroundColor: "#f8f9fa",
    margin: 10,
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#FE7000",
    position: "relative",
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  matchType: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FE7000",
    textTransform: "uppercase",
  },
  matchDate: {
    fontSize: 12,
    color: "#666",
  },
  matchPlayers: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  teamText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    textAlign: "center",
  },
  vsText: {
    fontSize: 14,
    color: "#666",
    marginHorizontal: 10,
  },
  matchScore: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#666",
  },
  winnerScore: {
    color: "#FE7000",
  },
  scoreSeparator: {
    fontSize: 24,
    fontWeight: "600",
    color: "#666",
    marginHorizontal: 10,
  },
  setsScore: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 8,
  },
  setScore: {
    fontSize: 12,
    color: "#666",
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ratingChanges: {
    alignItems: "center",
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    color: "#FE7000",
    fontWeight: "500",
  },
  longPressHint: {
    position: "absolute",
    bottom: 8,
    right: 12,
  },
  hintText: {
    fontSize: 10,
    color: "#999",
    fontStyle: "italic",
  },
});
