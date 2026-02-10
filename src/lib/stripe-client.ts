import { loadStripe } from '@stripe/stripe-js';

export const getStripe = () => {
  return loadStripe('pk_test_51SzIQJ2QSTNweAqsZM8os7i01Dk0iNaKdwntrlNj5iHpua40u84k6khEhGpd57jt5ZTIJClfsQzfMsjz3zg1IA5j00nRnDOogY');
};
