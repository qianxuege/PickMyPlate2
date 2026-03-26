import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { RestaurantUiInspect } from '@/constants/restaurant-ui-inspect';

type Props = {
  is_featured: boolean;
  is_new: boolean;
};

export function HighlightDishBadges({ is_featured, is_new }: Props) {
  if (!is_featured && !is_new) return null;
  return (
    <View style={styles.row}>
      {is_featured ? (
        <View style={[styles.pill, styles.featured]}>
          <MaterialCommunityIcons name="star" size={12} color={RestaurantUiInspect.featuredGoldText} />
          <Text style={styles.featuredText}>Featured</Text>
        </View>
      ) : null}
      {is_new ? (
        <View style={[styles.pill, styles.newPill]}>
          <Text style={styles.newText}>New</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  featured: {
    backgroundColor: RestaurantUiInspect.featuredGold,
  },
  featuredText: {
    fontSize: 12,
    fontWeight: '700',
    color: RestaurantUiInspect.featuredGoldText,
  },
  newPill: {
    backgroundColor: RestaurantUiInspect.newBlueBg,
  },
  newText: {
    fontSize: 12,
    fontWeight: '700',
    color: RestaurantUiInspect.newBlueText,
  },
});
