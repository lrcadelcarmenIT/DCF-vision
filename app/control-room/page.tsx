import Dashboard from "../dashboard";
import { requireChatGPTUser } from "../chatgpt-auth";
export const dynamic = "force-dynamic";
export default async function ControlRoom() {
  await requireChatGPTUser("/control-room");
  return <Dashboard />;
}
