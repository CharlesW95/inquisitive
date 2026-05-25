export const serifBodyMarkdownStyles = {
  body: {
    fontFamily: 'Fraunces-Light',
    fontSize: 17,
    lineHeight: 28,
    letterSpacing: 0.085,
    color: 'rgba(255,255,255,0.85)',
  },
  strong: { fontFamily: 'Fraunces-Bold', fontWeight: undefined as undefined },
  paragraph: { marginBottom: 12, marginTop: 0 },
  bullet_list: { marginVertical: 4 },
  list_item: {
    fontFamily: 'Fraunces-Light',
    fontSize: 17,
    lineHeight: 28,
    letterSpacing: 0.085,
    color: 'rgba(255,255,255,0.85)',
  },
};

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
    serif: "Fraunces",
  },
} as const;
