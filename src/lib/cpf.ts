// Formata progressivamente enquanto o usuário digita (000.000.000-00).
export function formatarCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

// Valida os dígitos verificadores reais (mod 11), não só o formato —
// usada tanto no cliente (bloquear o botão) quanto no servidor
// (mp-criar-preferencia, antes de repassar ao payer.identification do MP).
export function validarCPF(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const calcularDigito = (base: string): number => {
    let total = 0;
    let fator = base.length + 1;
    for (const char of base) {
      total += parseInt(char, 10) * fator--;
    }
    const resto = total % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const digito1 = calcularDigito(digits.slice(0, 9));
  const digito2 = calcularDigito(digits.slice(0, 9) + digito1);

  return digits === digits.slice(0, 9) + String(digito1) + String(digito2);
}
