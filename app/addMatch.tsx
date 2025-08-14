import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import { useNavigation } from "@react-navigation/native";

type Player = {
  name: string;
  rating: number;
};

type SetScore = {
  team1: number;
  team2: number;
};

export default function AddMatchScreen() {
  const [matchType, setMatchType] = useState<"singles" | "doubles">("singles");
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState({
    team1: ["", ""],
    team2: ["", ""],
  });
  const [sets, setSets] = useState<SetScore[]>([{ team1: 0, team2: 0 }]);
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      title: "Add New Match",
      headerTintColor: "#fff",
      headerStyle: {
        backgroundColor: "#FE7000",
      },
      headerBackTitle: "Back",
    });
  }, [navigation]);

  useEffect(() => {
    loadPlayers();
  }, []);

  // Handle returning from player selection
  useFocusEffect(
    React.useCallback(() => {
      const handlePlayerSelection = async () => {
        try {
          const stored = await AsyncStorage.getItem("selectedPlayer");
          if (stored) {
            const selectionData = JSON.parse(stored);

            // Apply the selection
            handlePlayerChange(
              selectionData.team as "team1" | "team2",
              selectionData.index,
              selectionData.playerName
            );

            // Clear the stored selection
            await AsyncStorage.removeItem("selectedPlayer");
          }
        } catch (err) {
          console.error("Error handling player selection", err);
        }

        // Always reload players to ensure we have the latest data
        loadPlayers();
      };

      handlePlayerSelection();
    }, [])
  );

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

  const handlePlayerChange = (
    team: "team1" | "team2",
    index: number,
    value: string
  ) => {
    setSelectedPlayers((prev) => ({
      ...prev,
      [team]: prev[team].map((player, i) => (i === index ? value : player)),
    }));
  };

  const openPlayerSelection = (team: "team1" | "team2", index: number) => {
    const usedPlayers = getUsedPlayers();
    const currentPlayer = selectedPlayers[team][index];

    // Remove current player from used list so they can reselect themselves
    const filteredUsed = usedPlayers.filter((p) => p !== currentPlayer);

    router.push({
      pathname: "/selectPlayer",
      params: {
        team,
        index: index.toString(),
        usedPlayers: JSON.stringify(filteredUsed),
        returnPath: "/addMatch",
      },
    });
  };

  const getUsedPlayers = (): string[] => {
    const used: string[] = [];
    if (matchType === "singles") {
      if (selectedPlayers.team1[0]) used.push(selectedPlayers.team1[0]);
      if (selectedPlayers.team2[0]) used.push(selectedPlayers.team2[0]);
    } else {
      selectedPlayers.team1.forEach((p) => p && used.push(p));
      selectedPlayers.team2.forEach((p) => p && used.push(p));
    }
    return used;
  };

  const handleSetScoreChange = (
    setIndex: number,
    team: "team1" | "team2",
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    setSets((prev) =>
      prev.map((set, i) =>
        i === setIndex ? { ...set, [team]: numValue } : set
      )
    );
  };

  const addSet = () => {
    if (sets.length < 5) {
      setSets((prev) => [...prev, { team1: 0, team2: 0 }]);
    }
  };

  const removeSet = (index: number) => {
    if (sets.length > 1) {
      setSets((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const validateMatch = (): { isValid: boolean; error?: string } => {
    // Check if all players are selected
    const requiredPlayers = matchType === "singles" ? 1 : 2;
    const team1Players = selectedPlayers.team1.filter((p) => p !== "").length;
    const team2Players = selectedPlayers.team2.filter((p) => p !== "").length;

    if (team1Players < requiredPlayers || team2Players < requiredPlayers) {
      return { isValid: false, error: "Please select all players" };
    }

    // Check if all sets have scores
    const hasEmptyScores = sets.some(
      (set) => set.team1 === 0 && set.team2 === 0
    );
    if (hasEmptyScores) {
      return { isValid: false, error: "Please enter scores for all sets" };
    }

    // Validate each set follows ping pong rules
    for (let i = 0; i < sets.length; i++) {
      const set = sets[i];
      const { isValid, error } = validateSet(set.team1, set.team2);
      if (!isValid) {
        return { isValid: false, error: `Set ${i + 1}: ${error}` };
      }
    }

    // Check if match has a clear winner (best of sets)
    const team1Wins = sets.filter((set) => set.team1 > set.team2).length;
    const team2Wins = sets.filter((set) => set.team2 > set.team1).length;

    if (team1Wins === team2Wins) {
      return { isValid: false, error: "Match must have a clear winner" };
    }

    // For best of 3, someone must win 2 sets
    if (sets.length >= 2) {
      const maxWins = Math.max(team1Wins, team2Wins);
      if (maxWins < Math.ceil(sets.length / 2)) {
        return {
          isValid: false,
          error: "No team has won enough sets to win the match",
        };
      }
    }

    return { isValid: true };
  };

  const validateSet = (
    score1: number,
    score2: number
  ): { isValid: boolean; error?: string } => {
    // Both scores must be positive
    if (score1 < 0 || score2 < 0) {
      return { isValid: false, error: "Scores cannot be negative" };
    }

    // At least one team must reach 11 points to win a set
    if (Math.max(score1, score2) < 11) {
      return { isValid: false, error: "Winner must score at least 11 points" };
    }

    // Must win by at least 2 points
    if (Math.abs(score1 - score2) < 2) {
      return { isValid: false, error: "Must win by at least 2 points" };
    }

    const winner = Math.max(score1, score2);
    const loser = Math.min(score1, score2);

    // Check for impossible scores
    if (loser >= 11) {
      // In deuce scenario (both players have 10+)
      if (loser < 10) {
        return {
          isValid: false,
          error:
            "If loser has 11+ points, they must have reached at least 10 first",
        };
      }

      // In deuce, you can only win by exactly 2 points
      if (winner - loser !== 2) {
        return {
          isValid: false,
          error: "In deuce (10-10+), you must win by exactly 2 points",
        };
      }
    } else {
      // Normal game: loser has less than 11
      if (winner < 11) {
        return {
          isValid: false,
          error: "Winner must score at least 11 points",
        };
      }

      // Game should have ended at 11 if loser had less than 10
      if (loser < 10 && winner > 11) {
        return {
          isValid: false,
          error:
            "Game should have ended at 11-" +
            loser +
            " (loser had less than 10 points)",
        };
      }

      // If loser has exactly 10, winner can be 11 or 12 (if it went to deuce briefly)
      if (loser === 10 && winner > 12) {
        return {
          isValid: false,
          error: "With loser at 10, winner can only score up to 12 (12-10)",
        };
      }
    }

    return { isValid: true };
  };

  // Add ELO calculation functions
  const calculateEloRating = (
    winnerRating: number,
    loserRating: number,
    kFactor: number = 32
  ): { newWinnerRating: number; newLoserRating: number } => {
    // Calculate expected scores
    const expectedWinner =
      1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    const expectedLoser =
      1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));

    // Calculate new ratings
    const newWinnerRating = Math.round(
      winnerRating + kFactor * (1 - expectedWinner)
    );
    const newLoserRating = Math.round(
      loserRating + kFactor * (0 - expectedLoser)
    );

    return { newWinnerRating, newLoserRating };
  };

  const updatePlayerRatings = async (matchResult: {
    winners: string[];
    losers: string[];
    winnerTeamRating: number;
    loserTeamRating: number;
  }) => {
    try {
      const storedPlayers = await AsyncStorage.getItem("players");
      if (!storedPlayers) return;

      const players: Player[] = JSON.parse(storedPlayers);
      const { winners, losers, winnerTeamRating, loserTeamRating } =
        matchResult;

      // Calculate new ratings using team averages
      const { newWinnerRating, newLoserRating } = calculateEloRating(
        winnerTeamRating,
        loserTeamRating
      );

      // Calculate rating change
      const winnerChange = newWinnerRating - winnerTeamRating;
      const loserChange = newLoserRating - loserTeamRating;

      // Update winner ratings
      winners.forEach((winnerName) => {
        const playerIndex = players.findIndex((p) => p.name === winnerName);
        if (playerIndex !== -1) {
          players[playerIndex].rating += winnerChange;
          // Ensure rating doesn't go below a reasonable minimum
          players[playerIndex].rating = Math.max(
            players[playerIndex].rating,
            100
          );
        }
      });

      // Update loser ratings
      losers.forEach((loserName) => {
        const playerIndex = players.findIndex((p) => p.name === loserName);
        if (playerIndex !== -1) {
          players[playerIndex].rating += loserChange;
          // Ensure rating doesn't go below a reasonable minimum
          players[playerIndex].rating = Math.max(
            players[playerIndex].rating,
            100
          );
        }
      });

      // Save updated players
      await AsyncStorage.setItem("players", JSON.stringify(players));

      // Update local state
      setPlayers(players.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("Error updating player ratings", err);
    }
  };

  const saveMatch = async () => {
    try {
      // Validate the match
      const validation = validateMatch();
      if (!validation.isValid) {
        Alert.alert("Invalid Match", validation.error);
        return;
      }

      const team1Wins = sets.filter((set) => set.team1 > set.team2).length;
      const team2Wins = sets.filter((set) => set.team2 > set.team1).length;

      // Get player names
      const team1Players =
        matchType === "singles"
          ? [selectedPlayers.team1[0]]
          : selectedPlayers.team1.filter((p) => p !== "");
      const team2Players =
        matchType === "singles"
          ? [selectedPlayers.team2[0]]
          : selectedPlayers.team2.filter((p) => p !== "");

      // Calculate team ratings (average of team members)
      const getTeamRating = (teamPlayerNames: string[]): number => {
        const teamRatings = teamPlayerNames.map((playerName) => {
          const player = players.find((p) => p.name === playerName);
          return player ? player.rating : 1500; // Default rating if player not found
        });
        return Math.round(
          teamRatings.reduce((sum, rating) => sum + rating, 0) /
            teamRatings.length
        );
      };

      const team1Rating = getTeamRating(team1Players);
      const team2Rating = getTeamRating(team2Players);

      // Determine winner and loser
      const isTeam1Winner = team1Wins > team2Wins;
      const winners = isTeam1Winner ? team1Players : team2Players;
      const losers = isTeam1Winner ? team2Players : team1Players;
      const winnerTeamRating = isTeam1Winner ? team1Rating : team2Rating;
      const loserTeamRating = isTeam1Winner ? team2Rating : team1Rating;

      // Calculate rating changes for display
      const { newWinnerRating, newLoserRating } = calculateEloRating(
        winnerTeamRating,
        loserTeamRating
      );
      const ratingChange = newWinnerRating - winnerTeamRating;

      const match = {
        id: Date.now().toString(),
        type: matchType,
        players: {
          team1: team1Players,
          team2: team2Players,
        },
        sets: sets,
        score: {
          team1: team1Wins,
          team2: team2Wins,
        },
        date: new Date().toISOString(),
        winner: team1Wins > team2Wins ? "team1" : "team2",
        ratings: {
          before: {
            team1: team1Rating,
            team2: team2Rating,
          },
          after: {
            team1: isTeam1Winner ? newWinnerRating : newLoserRating,
            team2: isTeam1Winner ? newLoserRating : newWinnerRating,
          },
          change: {
            winners: ratingChange,
            losers: -ratingChange,
          },
        },
      };

      // Save match
      const stored = await AsyncStorage.getItem("matches");
      const matches = stored ? JSON.parse(stored) : [];
      matches.push(match);
      await AsyncStorage.setItem("matches", JSON.stringify(matches));

      // Update player ratings
      await updatePlayerRatings({
        winners,
        losers,
        winnerTeamRating,
        loserTeamRating,
      });

      // Show success message with rating changes
      const winnerNames = winners.join(" & ");
      const loserNames = losers.join(" & ");

      Alert.alert(
        "Match Saved!",
        `${winnerNames} defeated ${loserNames}\n\n` +
          `Rating Changes:\n` +
          `Winners: +${ratingChange} points\n` +
          `Losers: ${-ratingChange} points`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err) {
      console.error("Error saving match", err);
      Alert.alert("Error", "Failed to save match");
    }
  };

  const renderPlayerSelector = (
    team: "team1" | "team2",
    index: number,
    label: string
  ) => {
    const currentPlayer = selectedPlayers[team][index];

    return (
      <View style={styles.playerContainer} key={`${team}-${index}`}>
        <Text style={styles.playerLabel}>{label}</Text>
        <TouchableOpacity
          style={styles.playerButton}
          onPress={() => openPlayerSelection(team, index)}
        >
          <Text style={styles.playerButtonText}>
            {currentPlayer || "Select player..."}
          </Text>
          <Text style={styles.playerArrow}>→</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Match Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Match Type</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  styles.leftSegment,
                  matchType === "singles" && styles.activeSegment,
                ]}
                onPress={() => setMatchType("singles")}
              >
                <Text
                  style={[
                    styles.segmentText,
                    matchType === "singles" && styles.activeSegmentText,
                  ]}
                >
                  Singles
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  styles.rightSegment,
                  matchType === "doubles" && styles.activeSegment,
                ]}
                onPress={() => setMatchType("doubles")}
              >
                <Text
                  style={[
                    styles.segmentText,
                    matchType === "doubles" && styles.activeSegmentText,
                  ]}
                >
                  Doubles
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Players */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Players</Text>

            <Text style={styles.teamTitle}>Team 1</Text>
            {renderPlayerSelector("team1", 0, "Player 1")}
            {matchType === "doubles" &&
              renderPlayerSelector("team1", 1, "Player 2")}

            <Text style={styles.teamTitle}>Team 2</Text>
            {renderPlayerSelector("team2", 0, "Player 1")}
            {matchType === "doubles" &&
              renderPlayerSelector("team2", 1, "Player 2")}
          </View>

          {/* Sets */}
          <View style={styles.section}>
            <View style={styles.setsHeader}>
              <Text style={styles.sectionTitle}>Sets ({sets.length})</Text>
              {sets.length < 5 && (
                <TouchableOpacity onPress={addSet} style={styles.addSetButton}>
                  <Text style={styles.addSetButtonText}>+ Add Set</Text>
                </TouchableOpacity>
              )}
            </View>

            {sets.map((set, index) => (
              <View key={index} style={styles.setContainer}>
                <View style={styles.setHeader}>
                  <Text style={styles.setTitle}>Set {index + 1}</Text>
                  {sets.length > 1 && (
                    <TouchableOpacity onPress={() => removeSet(index)}>
                      <Text style={styles.removeSetButton}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.scoreInputs}>
                  <View style={styles.scoreInput}>
                    <Text style={styles.scoreLabel}>Team 1</Text>
                    <TextInput
                      style={styles.scoreField}
                      value={set.team1.toString()}
                      onChangeText={(value) =>
                        handleSetScoreChange(index, "team1", value)
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      returnKeyType="next"
                      selectTextOnFocus
                    />
                  </View>
                  <Text style={styles.scoreSeparator}>-</Text>
                  <View style={styles.scoreInput}>
                    <Text style={styles.scoreLabel}>Team 2</Text>
                    <TextInput
                      style={styles.scoreField}
                      value={set.team2.toString()}
                      onChangeText={(value) =>
                        handleSetScoreChange(index, "team2", value)
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      returnKeyType="done"
                      selectTextOnFocus
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={saveMatch}>
            <Text style={styles.saveButtonText}>Save Match</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40, // Extra padding at bottom
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },
  teamTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 15,
    marginBottom: 10,
    color: "#555",
  },
  playerContainer: {
    marginBottom: 15,
  },
  playerLabel: {
    fontSize: 14,
    marginBottom: 5,
    color: "#666",
  },
  playerButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playerButtonText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  playerArrow: {
    fontSize: 16,
    color: "#FE7000",
    fontWeight: "bold",
  },
  setsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  addSetButton: {
    backgroundColor: "#FE7000",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addSetButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  setContainer: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  setHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  setTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  removeSetButton: {
    color: "#ff3b30",
    fontSize: 14,
  },
  scoreInputs: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreInput: {
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5,
  },
  scoreField: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    width: 60,
    height: 40,
    textAlign: "center",
    fontSize: 16,
  },
  scoreSeparator: {
    fontSize: 20,
    fontWeight: "bold",
    marginHorizontal: 20,
    color: "#666",
  },
  saveButton: {
    backgroundColor: "#FE7000",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#f2f2f7",
    borderRadius: 8,
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  leftSegment: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  rightSegment: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  activeSegment: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  segmentText: {
    fontSize: 16,
    fontWeight: "400",
    color: "#666",
  },
  activeSegmentText: {
    color: "#FE7000",
    fontWeight: "600",
  },
});
