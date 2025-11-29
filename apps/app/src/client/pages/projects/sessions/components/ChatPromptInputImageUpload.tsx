import { ImageIcon } from "lucide-react";
import {
  PromptInputButton,
  usePromptInputAttachments,
} from "@/client/components/ai-elements/PromptInput";

export function ChatPromptInputImageUpload() {
  const attachments = usePromptInputAttachments();

  return (
    <PromptInputButton
      type="button"
      size="icon-responsive"
      className="md:hidden"
      onClick={() => attachments.openFileDialog()}
      aria-label="Upload image"
    >
      <ImageIcon size={20} className="md:size-4" />
    </PromptInputButton>
  );
}
