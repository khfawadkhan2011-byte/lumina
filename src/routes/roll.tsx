import { createFileRoute } from "@tanstack/react-router";
import { GalleryScreen } from "@/components/gallery/GalleryScreen";

export const Route = createFileRoute("/roll")({ component: Roll });

function Roll() {
  return <GalleryScreen />;
}
