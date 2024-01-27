import SuggestedProfiles from "@/Components/SuggestedProfiles";
import TrendingHashtags from "@/Components/Trending/TrendingHashtags";
import TrendingNotes from "@/Components/Trending/TrendingPosts";
import Discover from "@/Pages/Discover";
import HashTagsPage from "@/Pages/HashTagsPage";
import { ConversationsTab } from "@/Pages/Root/ConversationsTab";
import { DefaultTab } from "@/Pages/Root/DefaultTab";
import { FollowedByFriendsTab } from "@/Pages/Root/FollowedByFriendsTab";
import { GlobalTab } from "@/Pages/Root/GlobalTab";
import { NotesTab } from "@/Pages/Root/NotesTab";
import { TagsTab } from "@/Pages/Root/TagsTab";
import { TopicsPage } from "@/Pages/TopicsPage";

export const RootTabRoutes = [
  {
    path: "",
    element: <DefaultTab />,
  },
  {
    path: "global",
    element: <GlobalTab />,
  },
  {
    path: "notes",
    element: <NotesTab />,
  },
  {
    path: "followed-by-friends",
    element: <FollowedByFriendsTab />,
  },
  {
    path: "conversations",
    element: <ConversationsTab />,
  },
  {
    path: "discover",
    element: <Discover />,
  },
  {
    path: "tag/:tag",
    element: <TagsTab />,
  },
  {
    path: "trending/notes",
    element: <TrendingNotes />,
  },
  {
    path: "trending/hashtags",
    element: <TrendingHashtags />,
  },
  {
    path: "suggested",
    element: (
      <div className="p">
        <SuggestedProfiles />
      </div>
    ),
  },
  {
    path: "t/:tag",
    element: <HashTagsPage />,
  },
  {
    path: "topics",
    element: <TopicsPage />,
  },
];
