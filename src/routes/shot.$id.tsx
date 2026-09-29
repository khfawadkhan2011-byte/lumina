import { createFileRoute } from "@tanstack/react-router";
import { EditorScreen } from "@/components/editor/EditorScreen";

export const Route = createFileRoute("/shot/$id")({ component: ShotPage });

function ShotPage() {
  const { id } = Route.useParams();
  return <EditorScreen id={id} />;
}
