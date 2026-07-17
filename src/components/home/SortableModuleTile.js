import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Box from "@mui/material/Box";
import ModuleTile from "./ModuleTile";

export default function SortableModuleTile({ module }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : "auto",
    // Required so PointerSensor/TouchSensor can intercept the drag gesture
    // instead of the browser starting a page scroll on touch devices.
    touchAction: "none",
    cursor: "grab",
  };

  return (
    <Box ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ModuleTile module={module} />
    </Box>
  );
}
