import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { IconSymbol } from "@/components/ui/IconSymbol";

export default function RulesScreen() {
  const openEloLink = () => {
    Linking.openURL("https://en.wikipedia.org/wiki/Elo_rating_system");
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Match Rules</Text>
          <Text style={styles.rule}>• A set goes to 11 points</Text>
          <Text style={styles.rule}>
            • A game can be played in 1, 3 of 5 sets
          </Text>
          <Text style={styles.rule}>
            • To win a match you need 2 points difference
          </Text>
          <Text style={styles.rule}>• Service changes every 2 points</Text>
          <Text style={styles.rule}>
            • At 10-10 the service changes per point
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ELO Rating System</Text>
          <Text style={styles.rule}>
            All players start with a rating of 1500 points. After each match,
            ratings are updated based on:
          </Text>
          <Text style={styles.subRule}>
            • Your current rating vs your opponent's rating
          </Text>
          <Text style={styles.subRule}>
            • The expected outcome of the match
          </Text>
          <Text style={styles.subRule}>• Whether you won or lost</Text>

          <Text style={styles.ruleDescription}>
            If you beat a higher-rated player, you gain more points than beating
            a lower-rated player. The system automatically balances itself to
            reflect true skill levels over time.
          </Text>

          <TouchableOpacity style={styles.linkButton} onPress={openEloLink}>
            <IconSymbol name="link" size={16} color="#FE7000" />
            <Text style={styles.linkText}>
              Learn more about ELO rating system
            </Text>
            <IconSymbol name="chevron.right" size={16} color="#FE7000" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Doubles</Text>
          <Text style={styles.rule}>
            • The players of each team to alternate playing the ball. If not,
            the point is lost.
          </Text>
          <Text style={styles.rule}>
            • After serving twice, the team that just served switches side
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Rules</Text>
          <Text style={styles.rule}>
            • At service, the ball should first bounce on your side, then the
            other side
          </Text>
          <Text style={styles.rule}>
            • When playing doubles, the ball must be served diagonally.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Winning Points</Text>
          <Text style={styles.rule}>You win a point if your opponent:</Text>
          <Text style={styles.subRule}>
            • Fails to make a correct serve or return
          </Text>
          <Text style={styles.subRule}>• Lets the ball bounce twice</Text>
          <Text style={styles.subRule}>
            • Hits the ball into the net or off the table
          </Text>
          <Text style={styles.subRule}>
            • Hits the ball before letting it bounce on their side
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Disputes</Text>
          <Text style={styles.rule}>
            If there is a discussion about a point, ask AI and whatever it
            decides is final.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#FE7000",
  },
  rule: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
    color: "#333",
  },
  subRule: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 6,
    color: "#555",
    marginLeft: 10,
  },
  ruleDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 15,
    color: "#666",
    fontStyle: "italic",
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FE7000",
    marginTop: 5,
  },
  linkText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#FE7000",
    fontWeight: "500",
  },
});
