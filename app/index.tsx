import { Redirect } from "expo-router";

/** The bench opens on the characters. */
export default function Index() {
  return <Redirect href="/characters" />;
}
