import { Redirect } from "expo-router";

/** The bench opens on the roster. */
export default function Index() {
  return <Redirect href="/characters" />;
}
