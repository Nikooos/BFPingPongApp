import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
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
  rating: number; // This will be peak rating
  currentRating: number; // Add current rating
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  rank: number;
  isRetired?: boolean;
};

export default function HallOfFameScreen() {
  const [retiredPlayers, setRetiredPlayers] = useState<PlayerStats[]>([]);
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    navigation.setOptions({
      title: "Hall of Fame",
      headerStyle: {
        backgroundColor: "#DAA520", // Gold color for Hall of Fame
      },
      headerTintColor: "#fff",
      headerTitleStyle: {
        fontWeight: "600",
      },
    });
  }, [navigation]);

  useFocusEffect(
    React.useCallback(() => {
      loadRetiredPlayers();
    }, [])
  );

  const loadRetiredPlayers = async () => {
    try {
      // Load players and matches
      const [playersData, matchesData] = await Promise.all([
        AsyncStorage.getItem("players"),
        AsyncStorage.getItem("matches"),
      ]);

      if (!playersData) {
        setRetiredPlayers([]);
        return;
      }

      const players: Player[] = JSON.parse(playersData);
      const matches = matchesData ? JSON.parse(matchesData) : [];

      // Filter only retired players
      const retiredPlayersOnly = players.filter((player) => player.isRetired);

      if (retiredPlayersOnly.length === 0) {
        setRetiredPlayers([]);
        return;
      }

      // Calculate stats for each retired player
      const stats: PlayerStats[] = retiredPlayersOnly.map((player) => {
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

        // Calculate peak rating from match history
        let peakRating = 1500; // Default starting rating

        if (playerMatches.length > 0) {
          // Sort matches by date to track rating progression
          const sortedMatches = playerMatches
            .filter((match: any) => match.ratings) // Only matches with rating data
            .sort(
              (a: any, b: any) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );

          // Track the highest rating ever achieved
          for (const match of sortedMatches) {
            const isInTeam1 = match.players?.team1?.includes(player.name);
            const afterRating = isInTeam1
              ? match.ratings.after.team1
              : match.ratings.after.team2;

            if (afterRating > peakRating) {
              peakRating = afterRating;
            }
          }

          // If no rating data in matches, use current rating
          if (sortedMatches.length === 0) {
            peakRating = player.rating;
          }
        } else {
          // No matches played, use current rating
          peakRating = player.rating;
        }

        return {
          name: player.name,
          rating: Math.round(peakRating), // Peak rating for sorting
          currentRating: player.rating, // Current rating when retired
          matches: playerMatches.length,
          wins,
          losses,
          winRate,
          rank: 0, // Will be set after sorting
          isRetired: true,
        };
      });

      // Sort by peak rating (highest first) and assign ranks
      const sortedStats = stats.sort((a, b) => b.rating - a.rating);
      sortedStats.forEach((stat, index) => {
        stat.rank = index + 1;
      });

      setRetiredPlayers(sortedStats);
    } catch (err) {
      console.error("Error loading retired players", err);
    }
  };

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
      style={styles.playerItem}
      onPress={() => openPlayerDetails(item.name)}
      activeOpacity={0.7}
    >
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>{getRankIcon(item.rank)}</Text>
      </View>

      <View style={styles.playerInfo}>
        <View style={styles.playerNameRow}>
          <Text style={styles.playerName}>{item.name}</Text>
          <View style={styles.retiredBadge}>
            <IconSymbol name="star.fill" size={12} color="#DAA520" />
            <Text style={styles.retiredBadgeText}>RETIRED</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>
            {item.matches} matches • {item.wins}W {item.losses}L
            {item.matches > 0 && ` • ${item.winRate.toFixed(0)}% win rate`}
          </Text>
        </View>
        <Text style={styles.currentRatingText}>
          Current rating: {item.currentRating}
        </Text>
      </View>

      <View style={styles.ratingContainer}>
        <Text style={styles.ratingText}>{item.rating}</Text>
        <Text style={styles.ratingLabel}>Peak Rating</Text>
      </View>
      <IconSymbol name="chevron.right" size={16} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {retiredPlayers.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="star" size={64} color="#ddd" />
          <Text style={styles.emptyText}>No Retired Players</Text>
          <Text style={styles.emptySubtext}>
            When players retire, they'll be honored here in the Hall of Fame
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={retiredPlayers}
            keyExtractor={(item) => item.name}
            renderItem={renderPlayer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    borderLeftColor: "#DAA520",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  retiredBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8DC",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    gap: 3,
  },
  retiredBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#DAA520",
  },
  statsRow: {
    marginBottom: 4,
  },
  statText: {
    fontSize: 14,
    color: "#666",
  },
  currentRatingText: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
  },
  ratingContainer: {
    alignItems: "center",
    minWidth: 80,
  },
  ratingText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#DAA520",
  },
  ratingLabel: {
    fontSize: 11,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
