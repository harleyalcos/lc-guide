import { Image } from 'react-native';
// Original college seal supplied with the handbook photographs.
export function Emblem({ small = false }: { small?: boolean }) {
  return <Image source={require('../../assets/laguna-college-seal.png')} style={{ width: small ? 38 : 88, height: small ? 38 : 88, borderRadius: small ? 19 : 44 }} resizeMode="contain" accessibilityLabel="Laguna College seal" />;
}
