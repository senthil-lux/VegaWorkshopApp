import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  Pressable,
  ScrollView,
  FlatList,
} from 'react-native';
import type {NativeStackNavigationProp} from '@amazon-devices/react-native-screens/native-stack';
import type {RootStackParamList} from '../App';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

interface MovieItem {
  id: string;
  title: string;
  description: string;
  category: string;
  trending: boolean;
  images: {
    poster_16x9: string;
    thumbnail_450x253: string;
  };
  sources: Array<{
    type: string;
    url: string;
  }>;
}

interface CatalogData {
  items: MovieItem[];
}

// Sample HLS (.m3u8) adaptive streams. These play via the Shaka Player
// (MSE mode) wired up in VideoPlayerScreen. Thumbnails use a stable
// placeholder image service so the row renders without bundled assets.
const HLS_SAMPLES: MovieItem[] = [
  {
    id: 'hls-apple-bipbop',
    title: 'Apple BipBop (HLS)',
    description: 'Apple reference HLS stream with multiple bitrates.',
    category: 'HLS Streams (Shaka)',
    trending: false,
    images: {
      poster_16x9: 'https://picsum.photos/seed/hls-apple/1280/720',
      thumbnail_450x253: 'https://picsum.photos/seed/hls-apple/450/253',
    },
    sources: [
      {
        type: 'application/x-mpegURL',
        url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8',
      },
    ],
  },
  {
    id: 'hls-mux-x36',
    title: 'Mux Test Stream (HLS)',
    description: 'Mux multi-rendition HLS test stream.',
    category: 'HLS Streams (Shaka)',
    trending: false,
    images: {
      poster_16x9: 'https://picsum.photos/seed/hls-mux/1280/720',
      thumbnail_450x253: 'https://picsum.photos/seed/hls-mux/450/253',
    },
    sources: [
      {
        type: 'application/x-mpegURL',
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      },
    ],
  },
  {
    id: 'hls-tears-of-steel',
    title: 'Tears of Steel (HLS)',
    description: 'Blender open movie, adaptive HLS.',
    category: 'HLS Streams (Shaka)',
    trending: false,
    images: {
      poster_16x9: 'https://picsum.photos/seed/hls-tos/1280/720',
      thumbnail_450x253: 'https://picsum.photos/seed/hls-tos/450/253',
    },
    sources: [
      {
        type: 'application/x-mpegURL',
        url: 'https://test-streams.mux.dev/tos_ismc/main.m3u8',
      },
    ],
  },
  {
    id: 'hls-big-buck-bunny',
    title: 'Big Buck Bunny (HLS)',
    description: 'Classic open movie, adaptive HLS.',
    category: 'HLS Streams (Shaka)',
    trending: false,
    images: {
      poster_16x9: 'https://picsum.photos/seed/hls-bbb/1280/720',
      thumbnail_450x253: 'https://picsum.photos/seed/hls-bbb/450/253',
    },
    sources: [
      {
        type: 'application/x-mpegURL',
        url: 'https://test-streams.mux.dev/test_001/stream.m3u8',
      },
    ],
  },
  {
    id: 'hls-sintel',
    title: 'Sintel (HLS)',
    description: 'Blender open movie trailer, adaptive HLS.',
    category: 'HLS Streams (Shaka)',
    trending: false,
    images: {
      poster_16x9: 'https://picsum.photos/seed/hls-sintel/1280/720',
      thumbnail_450x253: 'https://picsum.photos/seed/hls-sintel/450/253',
    },
    sources: [
      {
        type: 'application/x-mpegURL',
        url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
      },
    ],
  },
  {
    id: 'hls-art-of-motion',
    title: 'Art of Motion (HLS)',
    description: 'Bitmovin sample, adaptive HLS.',
    category: 'HLS Streams (Shaka)',
    trending: false,
    images: {
      poster_16x9: 'https://picsum.photos/seed/hls-aom/1280/720',
      thumbnail_450x253: 'https://picsum.photos/seed/hls-aom/450/253',
    },
    sources: [
      {
        type: 'application/x-mpegURL',
        url: 'https://bitmovin-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8',
      },
    ],
  },
];

interface ThumbnailItemProps {
  item: MovieItem;
  onPress: () => void;
  onFocus: () => void;
}

const ThumbnailItem = ({item, onPress, onFocus}: ThumbnailItemProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      style={[styles.thumbnail, focused && styles.thumbnailFocused]}
      onFocus={() => {
        setFocused(true);
        onFocus();
      }}
      onBlur={() => setFocused(false)}
      onPress={onPress}>
      <Image
        source={{uri: item.images.thumbnail_450x253}}
        style={styles.thumbnailImage}
        resizeMode="cover"
      />
    </Pressable>
  );
};

interface ContentRowProps {
  title: string;
  items: MovieItem[];
  onItemPress: (item: MovieItem) => void;
  onItemFocus: (item: MovieItem) => void;
}

const ContentRow = ({title, items, onItemPress, onItemFocus}: ContentRowProps) => {
  const renderItem = ({item}: {item: MovieItem}) => {
    return (
      <ThumbnailItem
        item={item}
        onPress={() => onItemPress(item)}
        onFocus={() => onItemFocus(item)}
      />
    );
  };

  return (
    <View style={styles.rowContainer}>
      <Text style={styles.rowTitle}>{title}</Text>
      <FlatList
        data={items}
        horizontal
        renderItem={renderItem}
        keyExtractor={(item, index) => `${index}-${item.id}`}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
};

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

export const HomeScreen = ({navigation}: HomeScreenProps) => {
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [backgroundImage, setBackgroundImage] = useState<string>('');

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      const response = await fetch(
        'https://raw.githubusercontent.com/efahsl/scrap-tv-feed/refs/heads/main/catalog-fullUrls-720p.json',
      );
      const data: CatalogData = await response.json();
      setMovies(data.items);
    } catch (error) {
      console.error('Failed to fetch movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item: MovieItem) => {
    navigation.navigate('Detail', {
      bannerImage: item.images.poster_16x9,
      title: item.title,
      description: item.description,
      videoUrl: item.sources[0]?.url || '',
    });
  };

  const handleItemFocus = (item: MovieItem) => {
    // setBackgroundImage(item.images.poster_16x9);
    setBackgroundImage(item.images.thumbnail_450x253);    
  };

  // Group movies by category
  const groupMoviesByCategory = () => {
    const categoryMap: {[key: string]: MovieItem[]} = {};

    movies.forEach((movie) => {
      if (!categoryMap[movie.category]) {
        categoryMap[movie.category] = [];
      }
      categoryMap[movie.category].push(movie);
    });

    return categoryMap;
  };

  // Get trending movies
  const getTrendingMovies = () => {
    return movies.filter((movie) => movie.trending === true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  const trendingMovies = getTrendingMovies();
  const moviesByCategory = groupMoviesByCategory();
  const categories = Object.keys(moviesByCategory);

  return (
    <View style={styles.container}>
      {/* Background Image */}
      {backgroundImage ? (
        <Image
          source={{uri: backgroundImage}}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
      ) : null}

      {/* Dark Overlay */}
      <View style={styles.overlay} />

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* HLS Streams Row (adaptive playback via Shaka Player) */}
        <ContentRow
          title="HLS Streams (Shaka)"
          items={HLS_SAMPLES}
          onItemPress={handleItemPress}
          onItemFocus={handleItemFocus}
        />

        {/* Trending Now Row */}
        {trendingMovies.length > 0 && (
          <ContentRow
            title="Trending Now"
            items={trendingMovies}
            onItemPress={handleItemPress}
            onItemFocus={handleItemFocus}
          />
        )}

        {/* Category Rows */}
        {categories.map((category) => (
          <ContentRow
            key={category}
            title={category}
            items={moviesByCategory[category]}
            onItemPress={handleItemPress}
            onItemFocus={handleItemFocus}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  content: {
    flex: 1,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  rowContainer: {
    marginBottom: 40,
  },
  rowTitle: {
    fontSize: 48,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 20,
    paddingLeft: 60,
  },
  thumbnail: {
    width: 415,
    height: 235,
    margin: 15,
  },
  thumbnailFocused: {
    borderWidth: 4,
    borderColor: '#FFFFFF',
    transform: [{scale: 1.05}],
  },
  thumbnailImage: {
    width: 400,
    height: 225, // 16:9 aspect ratio (400/16*9 = 225)
  },
});
