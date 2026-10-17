import AppShell from "./app/AppShell.jsx";

const routeMap = {
  "/": "For you",
  "/feed": "For you",
  "/following": "Following",
  "/explore": "Explore",
  "/live": "LIVE",
  "/messages": "Messages",
  "/notifications": "Notifications",
  "/bookmarks": "Bookmarks",
  "/profile": "Profile",
};

export default function App() {
  const route = routeMap[window.location.pathname] || "For you";
  return <AppShell initialRoute={route} />;
}
