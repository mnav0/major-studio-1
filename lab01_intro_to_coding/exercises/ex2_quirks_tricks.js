/*
  Exercise 2
  JavaScript quirks and tricks
*/

var schoolName = "Parsons";
var schoolYear = 1936;

// Task
// What is the value of test3?
var test1;
if (1 == true) {
  test1 = true;
} else {
  test1 = false;
}

var test2;
if (1 === true) {
  test2 = true;
} else {
  test2 = false;
}

var test3 = test1 === test2;

// test1 is true
// test2 is false
// so test3 is false

// Task
// Change this code so test4 is false and test5 is true. Use console.log() to confirm your cod works.

var test4 = 0 === "";
var test5 = 1 == "1";

console.log("test4 is", test4, "and test 5 is", test5);

// Task
// What are the values of p, q, and r? Research what is going on here.
var w = 0.1;
var x = 0.2;
var y = 0.4;
var z = 0.5;

// for base 2 numbers in javascript the only prime number is 2 
// so decimals 0.1 and 0.5 are estimated here to the nearest decimal point 
// but stored under the hood as something like 0.1000000000000000055511151231257827021181583404541015625

// 0.1 + 0.2 = 0.3
var p = w + x;

// 0.5 - 0.2 = 0.3
var q = z - x;

// 0.4 - 0.1 = 0.3
var r = y - w;

console.log('p is ', p, 'q is ', q, 'r is ', r);