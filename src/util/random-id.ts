// gotta keep it within MAX_SAFE_INTEGER
const extraDigits = 3;

export function createRandomId() {
  // 13 time digits
  let datePart = new Date().getTime() * Math.pow(10, extraDigits);
  // 3 random digits
  let extraPart = Math.floor(Math.random() * Math.pow(10, extraDigits));
  // 16 digits
  return datePart + extraPart;
}
