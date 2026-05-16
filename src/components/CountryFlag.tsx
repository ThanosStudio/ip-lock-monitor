interface Props {
  countryCode: string | undefined
  size?: number
}

export function CountryFlag({ countryCode, size = 22 }: Props) {
  if (!countryCode) return <span style={{ fontSize: size }}>🌐</span>
  const flag = countryCode
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('')
  return <span style={{ fontSize: size, fontFamily: '"Apple Color Emoji", sans-serif' }}>{flag}</span>
}
