import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/IconSymbol";

type Player = {
  name: string;
  rating: number;
  isRetired?: boolean;
};

type PlayerStats = {
  name: string;
  rating: number;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  rank: number;
  isRetired?: boolean;
};

export default function RankingScreen() {
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [showRetired, setShowRetired] = useState(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    navigation.setOptions({
      title: "Ranking",
      headerStyle: {
        backgroundColor: "#FE7000",
      },
      headerTintColor: "#fff",
      headerTitleStyle: {
        fontWeight: "600",
      },
    });
  }, [navigation]);

  useFocusEffect(
    React.useCallback(() => {
      loadRankings();
    }, [showRetired])
  );

  const loadRankings = async () => {
    try {
      // Load players and matches
      const [playersData, matchesData] = await Promise.all([
        AsyncStorage.getItem("players"),
        AsyncStorage.getItem("matches"),
      ]);

      if (!playersData) {
        setPlayerStats([]);
        setAllPlayers([]);
        return;
      }

      const players: Player[] = JSON.parse(playersData);
      const matches = matchesData ? JSON.parse(matchesData) : [];

      // Store all players for retired count calculation
      setAllPlayers(players);

      // Check if there are any retired players
      const currentRetiredCount = players.filter((p) => p.isRetired).length;

      // If no retired players and switch is on, turn it off
      if (currentRetiredCount === 0 && showRetired) {
        setShowRetired(false);
        // Return early, the useEffect will call loadRankings again with showRetired = false
        return;
      }

      // Calculate stats for each player
      const stats: PlayerStats[] = players.map((player, index) => {
        const playerMatches = matches.filter(
          (match: any) =>
            match.players?.team1?.includes(player.name) ||
            match.players?.team2?.includes(player.name)
        );

        const wins = playerMatches.filter((match: any) => {
          const isInTeam1 = match.players?.team1?.includes(player.name);
          return (
            (isInTeam1 && match.winner === "team1") ||
            (!isInTeam1 && match.winner === "team2")
          );
        }).length;

        const losses = playerMatches.length - wins;
        const winRate =
          playerMatches.length > 0 ? (wins / playerMatches.length) * 100 : 0;

        return {
          name: player.name,
          rating: player.rating,
          matches: playerMatches.length,
          wins,
          losses,
          winRate,
          rank: 0, // Will be set after sorting
          isRetired: player.isRetired || false,
        };
      });

      // Filter based on retirement status - use current showRetired state
      const filteredStats = showRetired
        ? stats
        : stats.filter((stat) => !stat.isRetired);

      // Sort by rating (highest first) and assign ranks
      const sortedStats = filteredStats.sort((a, b) => b.rating - a.rating);
      sortedStats.forEach((stat, index) => {
        stat.rank = index + 1;
      });

      setPlayerStats(sortedStats);
    } catch (err) {
      console.error("Error loading rankings", err);
    }
  };

  // Re-load when showRetired changes
  useEffect(() => {
    loadRankings();
  }, [showRetired]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return "🏆";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `#${rank}`;
    }
  };

  const openPlayerDetails = (playerName: string) => {
    router.push({
      pathname: "/playerDetail",
      params: { name: playerName },
    });
  };

  const renderPlayer = ({ item }: { item: PlayerStats }) => (
    <TouchableOpacity
      style={[styles.playerItem, item.isRetired && styles.retiredPlayerItem]}
      onPress={() => openPlayerDetails(item.name)}
      activeOpacity={0.7}
    >
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>{getRankIcon(item.rank)}</Text>
      </View>

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
              <IconSymbol name="star.fill" size={12} color="#666" />
              <Text style={styles.retiredBadgeText}>RETIRED</Text>
            </View>
          )}
        </View>
        <Text style={styles.statText}>
          {item.matches} matches • {item.wins}W {item.losses}L
          {item.matches > 0 && ` • ${item.winRate.toFixed(0)}% win rate`}
        </Text>
      </View>

      <View style={styles.ratingContainer}>
        <Text
          style={[
            styles.ratingText,
            item.isRetired && styles.retiredRatingText,
          ]}
        >
          {item.rating}
        </Text>
        <Text style={styles.ratingLabel}>Rating</Text>
      </View>
      <IconSymbol name="chevron.right" size={16} color="#ccc" />
    </TouchableOpacity>
  );

  // Calculate retired count from all players, not filtered ones
  const retiredCount = allPlayers.filter((p) => p.isRetired).length;

  return (
    <View style={styles.container}>
      {/* Retired Players Toggle */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleContent}>
          <Text
            style={[
              styles.toggleLabel,
              retiredCount === 0 && styles.disabledToggleLabel,
            ]}
          >
            Show retired players ({retiredCount})
          </Text>
          <Switch
            value={showRetired}
            onValueChange={setShowRetired}
            disabled={retiredCount === 0}
            trackColor={{
              false: retiredCount === 0 ? "#f0f0f0" : "#e0e0e0",
              true: "#FE7000",
            }}
            thumbColor={showRetired ? "#fff" : "#f4f3f4"}
          />
        </View>
      </View>

      {playerStats.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="trophy" size={64} color="#ddd" />
          <Text style={styles.emptyText}>
            {showRetired ? "No retired players" : "No active players"}
          </Text>
          <Text style={styles.emptySubtext}>
            {showRetired
              ? "All players are still active"
              : "Add some players and play matches to see rankings"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={playerStats}
          keyExtractor={(item) => item.name}
          renderItem={renderPlayer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
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
  toggleContainer: {
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  toggleContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  disabledToggleLabel: {
    color: "#999",
  },
  listContainer: {
    padding: 10,
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
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  playerItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 15,
    marginVertical: 5,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#FE7000",
  },
  retiredPlayerItem: {
    backgroundColor: "#f5f5f5",
    borderLeftColor: "#999",
    opacity: 0.7,
  },
  rankContainer: {
    width: 50,
    alignItems: "center",
  },
  rankText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  playerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  playerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  playerName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  retiredPlayerName: {
    color: "#999",
  },
  retiredBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    gap: 3,
  },
  retiredBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#666",
  },
  statText: {
    fontSize: 14,
    color: "#666",
  },
  ratingContainer: {
    alignItems: "center",
    minWidth: 80,
  },
  ratingText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FE7000",
  },
  retiredRatingText: {
    color: "#999",
  },
  ratingLabel: {
    fontSize: 11,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
