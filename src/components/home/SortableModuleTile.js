import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Box from "@mui/material/Box";
import ModuleTile from "./ModuleTile";

export default function SortableModuleTile({ module, size }) {
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
    // Grid items default to min-width: auto, which lets a track grow past
    // its 1fr share to fit this item's content instead of shrinking - that
    // was pushing the 3rd column off narrow phone screens. minWidth: 0
    // forces it to respect the column's actual allotted width.
    minWidth: 0,
  };

  return (
    <Box ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ModuleTile module={module} size={size} />
    </Box>
  );
}
