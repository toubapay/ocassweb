import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

const AUTO_ADVANCE_MS = 5000;

/**
 * Backend-driven sibling of HeroBanner.js's hardcoded app-promo carousel -
 * same swipeable/auto-advancing mechanics, but slides come from
 * GET /ecommerce/showcase-slides (admin-managed, see AdminShowcaseTab.js)
 * and typically point at real products/categories rather than app
 * modules. Renders nothing while there are no active slides, so an admin
 * who hasn't set any up yet doesn't leave an empty gap on the page.
 */
export default function ProductShowcaseCarousel({ slides }) {
  const router = useRouter();
  const containerRef = useRef(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }, [index]);

  if (slides.length === 0) return null;

  return (
    <Box sx={{ px: 2, pt: 1.5 }}>
      <Box
        ref={containerRef}
        sx={{
          display: "flex",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          borderRadius: 3,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== index) setIndex(i);
        }}
      >
        {slides.map((slide) => (
          <Box
            key={slide.id}
            onClick={() => slide.linkUrl && router.push(slide.linkUrl)}
            sx={{
              position: "relative",
              flex: "0 0 100%",
              scrollSnapAlign: "start",
              minHeight: 140,
              borderRadius: 3,
              overflow: "hidden",
              cursor: slide.linkUrl ? "pointer" : "default",
            }}
          >
            <Box
              component="img"
              src={slide.imageUrl}
              alt={slide.title}
              sx={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
            />
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 55%)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                p: 2,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#fff" }}>
                {slide.title}
              </Typography>
              {slide.subtitle && (
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }}>
                  {slide.subtitle}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
      {slides.length > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", gap: 0.75, mt: 1 }}>
          {slides.map((slide, i) => (
            <Box
              key={slide.id}
              sx={{
                width: i === index ? 16 : 6,
                height: 6,
                borderRadius: 3,
                bgcolor: i === index ? "primary.main" : "grey.300",
                transition: "width 0.2s",
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
