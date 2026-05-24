export const typography = {
  sizes: {
    xs:   11,
    sm:   13,
    base: 15,
    md:   17,
    xl:   28,
    xxl:  36,
  },
  weights: {
    regular:  "400" as const,
    medium:   "500" as const,
    semibold: "600" as const,
    bold:     "700" as const,
  },
  letterSpacing: {
    normal: 0,
    wide:   0.8,
    wider:  1.2,
  },
  fonts: {
    sans:  "Inter",
    serif: "PlayfairDisplay",
  },
} as const;
