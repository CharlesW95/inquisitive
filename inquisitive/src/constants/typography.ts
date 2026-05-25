const serifBodyBase = {
  fontFamily: 'Fraunces-Light',
  fontSize: 17,
  lineHeight: 28,
  letterSpacing: 0.085,
  color: 'rgba(255,255,255,0.85)',
};

export const serifBodyMarkdownStyles = {
  body: serifBodyBase,
  strong: { fontFamily: 'Fraunces-Bold', fontWeight: undefined as undefined },
  paragraph: { marginBottom: 12, marginTop: 0 },
  bullet_list: { marginVertical: 4 },
  list_item: serifBodyBase,
  // Normalize headings to body size — no giant H1s in chat responses
  heading1: serifBodyBase,
  heading2: serifBodyBase,
  heading3: serifBodyBase,
  heading4: serifBodyBase,
  heading5: serifBodyBase,
  heading6: serifBodyBase,
};

const cardAnswerBase = {
  fontFamily: 'Fraunces',
  fontSize: 15,
  lineHeight: 22,
  color: '#888884',
};

const SESSION_TEXT_PRIMARY = '#F0EFE8';

const sessionQuestionBase = {
  fontFamily: 'Fraunces',
  fontSize: 22,
  lineHeight: 30,
  color: SESSION_TEXT_PRIMARY,
};

export const sessionQuestionMarkdownStyles = {
  body: sessionQuestionBase,
  strong: { fontFamily: 'Fraunces-Bold', fontWeight: undefined as undefined },
  em: { fontFamily: 'Fraunces', fontStyle: 'italic' as const },
  paragraph: { marginBottom: 0, marginTop: 0 },
};

const sessionAnswerBase = {
  fontFamily: 'Fraunces',
  fontSize: 17,
  lineHeight: 26,
  color: SESSION_TEXT_PRIMARY,
};

export const sessionAnswerMarkdownStyles = {
  body: sessionAnswerBase,
  strong: { fontFamily: 'Fraunces-Bold', fontWeight: undefined as undefined },
  em: { fontFamily: 'Fraunces', fontStyle: 'italic' as const },
  paragraph: { marginBottom: 8, marginTop: 0 },
  bullet_list: { marginVertical: 4 },
  list_item: sessionAnswerBase,
  heading1: sessionAnswerBase,
  heading2: sessionAnswerBase,
  heading3: sessionAnswerBase,
};

const cardQuestionBase = {
  fontFamily: 'Fraunces',
  fontSize: 17,
  lineHeight: 24,
  color: SESSION_TEXT_PRIMARY,
};

export const cardQuestionMarkdownStyles = {
  body: cardQuestionBase,
  strong: { fontFamily: 'Fraunces-Bold', fontWeight: undefined as undefined },
  em: { fontFamily: 'Fraunces', fontStyle: 'italic' as const },
  paragraph: { marginBottom: 0, marginTop: 0 },
};

const reviewCardQuestionBase = {
  fontFamily: 'Fraunces',
  fontSize: 14,
  lineHeight: 20,
  color: SESSION_TEXT_PRIMARY,
};

export const reviewCardQuestionMarkdownStyles = {
  body: reviewCardQuestionBase,
  strong: { fontFamily: 'Fraunces-Bold', fontWeight: undefined as undefined },
  em: { fontFamily: 'Fraunces', fontStyle: 'italic' as const },
  paragraph: { marginBottom: 0, marginTop: 0 },
};

export const cardAnswerMarkdownStyles = {
  body: cardAnswerBase,
  strong: { fontFamily: 'Fraunces-Bold', fontWeight: undefined as undefined },
  paragraph: { marginBottom: 8, marginTop: 0 },
  bullet_list: { marginVertical: 2 },
  list_item: cardAnswerBase,
  // Normalize headings — card answers shouldn't have large headers
  heading1: cardAnswerBase,
  heading2: cardAnswerBase,
  heading3: cardAnswerBase,
  heading4: cardAnswerBase,
  heading5: cardAnswerBase,
  heading6: cardAnswerBase,
};

export const typography = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    xl: 28,
    xxl: 36,
  },
  weights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
  letterSpacing: {
    normal: 0,
    wide: 0.8,
    wider: 1.2,
  },
  fonts: {
    sans: "Inter",
    serif: "Fraunces",
  },
} as const;
