import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

const AUTO_ADVANCE_MS = 5000;

/**
 * Auto-rotating promo carousel, swipeable via native CSS scroll-snap
 * (no carousel library) - the hero banner every multi-vendor marketplace
 * home page opens with. Slide content is hardcoded here rather than
 * backend-driven - there's no CMS/banner-management concept in this app
 * (unlike e.g. admin-managed ModuleConfig), so these are just static
 * promos for the app's own modules.
 */
const SLIDES = [
  {
    key: "sale",
    href: "/ecommerce?tab=flash",
    gradient: "linear-gradient(135deg, #0FAE58 0%, #0B8A45 100%)",
  },
  {
    key: "vendor",
    href: "/vendor/register",
    gradient: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
  },
  {
    key: "restaurant",
    href: "/restaurant",
    gradient: "linear-gradient(135deg, #F97316 0%, #C2410C 100%)",
  },
];

export default function HeroBanner({ t }) {
  const router = useRouter();
  const containerRef = useRef(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }, [index]);

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
        {SLIDES.map((slide) => (
          <Box
            key={slide.key}
            onClick={() => router.push(slide.href)}
            sx={{
              flex: "0 0 100%",
              scrollSnapAlign: "start",
              minHeight: 132,
              borderRadius: 3,
              background: slide.gradient,
              color: "#fff",
              p: 2.5,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
              {t(`ecommerce.home.banners.${slide.key}.title`)}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {t(`ecommerce.home.banners.${slide.key}.subtitle`)}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.75, mt: 1 }}>
        {SLIDES.map((slide, i) => (
          <Box
            key={slide.key}
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
    </Box>
  );
}
