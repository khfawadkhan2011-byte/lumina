import { createFileRoute } from "@tanstack/react-router";
import { CameraScreen } from "@/components/camera/CameraScreen";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <CameraScreen />;
}
