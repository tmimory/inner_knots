import { View } from "react-native";

import { Scroll } from "@/components/shell";
import { Text } from "@/components/ui";
import { useTheme } from "@/theme";

export type FlowNoticeProps = {
  /** One line, in the screen's own voice, standing in for the canvas. */
  message: string;
};

/**
 * What stands where a canvas would be: while the browser is still fetching it,
 * and on native, where there is no DOM for React Flow to draw on. It keeps the
 * canvas's height so the page does not jump when the real thing arrives.
 */
export function FlowNotice({ message }: FlowNoticeProps) {
  const theme = useTheme();
  return (
    <Scroll className="w-full">
      <View className="items-center justify-center" style={{ minHeight: theme.layout.canvas }}>
        <Text variant="lead" className="text-center">
          {message}
        </Text>
      </View>
    </Scroll>
  );
}
