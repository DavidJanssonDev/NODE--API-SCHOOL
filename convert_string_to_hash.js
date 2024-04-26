const bcrypt = require("bcrypt");

function convertStringToHash(string) {
  const amountOfRange = Math.floor(Math.random()) + 1;
  const hash = bcrypt.hashSync(
    string,
    Math.floor(Math.random() * amountOfRange) + 1
  );
  return hash;
}

function Validate(passowrd, hash) {
  return bcrypt.compareSync(passowrd, hash);
}
let passowrd_array = [];

passowrd_array.push(convertStringToHash("password_1"));
passowrd_array.push(convertStringToHash("password_2"));
passowrd_array.push(convertStringToHash("password_3"));
passowrd_array.push(convertStringToHash("password_4"));
passowrd_array.push(convertStringToHash("password_5"));
passowrd_array.push(convertStringToHash("password_6"));
passowrd_array.push(convertStringToHash("password_7"));
passowrd_array.push(convertStringToHash("password_8"));
passowrd_array.push(convertStringToHash("password_9"));
passowrd_array.push(convertStringToHash("password_10"));

for (let i = 0; i < passowrd_array.length; i++) {
  let element = passowrd_array[i];

  console.log("password_" + (i + 1));
  console.log(element);
  console.log();
}
