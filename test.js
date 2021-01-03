function test() {
  let prom = new Promise((resolve, reject) => {
    resolve('Success!');
  })
  return prom.then(value => {
 	return value
  });
}
async function test1() {
    return await test()
}

console.log(test1())
