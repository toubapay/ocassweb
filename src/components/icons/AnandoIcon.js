import SvgIcon from "@mui/material/SvgIcon";

// Custom glyph (Anando has no stock MUI icon): a car carrying two
// passengers, built from plain shapes rather than hand-authored path data.
export default function AnandoIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M3.3 13.5l1.3-3.1a2 2 0 0 1 1.85-1.2h3.24a2 2 0 0 1 1.85 1.2l1.3 3.1H3.3z" />
      <rect x="1" y="13.5" width="13" height="4.5" rx="2.2" />
      <circle cx="4.5" cy="18.3" r="1.6" />
      <circle cx="10.5" cy="18.3" r="1.6" />
      <circle cx="17" cy="5.2" r="2" />
      <path d="M17 8c-2 0-3.6 1.4-3.6 3.1v.9h7.2v-.9C20.6 9.4 19 8 17 8z" />
      <circle cx="21.3" cy="7.4" r="1.6" opacity="0.55" />
      <path d="M21.3 9.6c-1.6 0-2.9 1.1-2.9 2.5v.6h5.8v-.6c0-1.4-1.3-2.5-2.9-2.5z" opacity="0.55" />
    </SvgIcon>
  );
}
