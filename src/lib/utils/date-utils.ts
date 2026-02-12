import { addMonths, format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const calculateExpirationDate = (purchaseDate: string, months: number) => {
  return addMonths(parseISO(purchaseDate), months).toISOString().split('T')[0];
};

export const getDaysRemaining = (expirationDate: string) => {
  return differenceInDays(parseISO(expirationDate), new Date());
};

export const formatDate = (date: string) => {
  if (!date) return '---';
  return format(parseISO(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
};

// Nova função: Gerar link para arquivo de Calendário (iCal)
export const generateICalLink = (name: string, expirationDate: string) => {
  const date = expirationDate.replace(/-/g, '');
  const content = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `SUMMARY:Vencimento de Garantia: ${name}`,
    `DTSTART;VALUE=DATE:${date}`,
    `DTEND;VALUE=DATE:${date}`,
    `DESCRIPTION:Sua proteção para o produto ${name} vence hoje. Verifique no Guardião de Notas.`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\n');

  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  return URL.createObjectURL(blob);
};