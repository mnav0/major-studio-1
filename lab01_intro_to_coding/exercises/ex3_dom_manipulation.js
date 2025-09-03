/*
  Exercise 3
  DOM manipulation with vanilla JS
*/

// Task
// What does DOM stand for?
// DOM stands for document object model, the structure of objects in a document/web page

// Task
// Open the file index.html in your browser. Open the index.html file in VS Code, right-click the tab and select "Open in Browser"
// If you are working locally, navigate to the excercise directory and start a python http server `python3 -m http.server 900`, press Control-c to stop the server 

// Task
// Delete the div with the class rectangle from index.html and refresh the preview.

// Task
// What does the following code do?
const viz = document.body.querySelector(".viz");
const button = document.body.querySelector("#button");
// selects the first element with the class "viz", in this case a div and assigns it to a variable
// selects the element with the id "button" and assigns it to a variable

console.log(viz, viz.children);

const addChildToViz = () => {
  const newChild = document.createElement("div");
  newChild.className = "rectangle";
  newChild.style.height = Math.random() * 100 + "px";
  viz.appendChild(newChild);
};

// Task
// Modify index.html to make this event listener work
// don't need to modify?
button.addEventListener("click", addChildToViz);

// Task
// Where can you see the results of the console.log below? How is it different from in previous exercises?

// in the browser console by inspecting the page, because we're running it on a local server here 
// and opening it in a browser rather than just compiling the file in the terminal

function drawIrisData() {
  window
    .fetch("./iris_json.json")
    .then(data => data.json())
    .then(data => {
      data.forEach((item) => {
        const iris = document.createElement("div");
        iris.className = item.class;
        iris.style.height = item.petallength * 100 + "px";
        iris.style.width = item.petalwidth * 100 + "px";
        viz.appendChild(iris);
      })
    });
}

drawIrisData();

// Task
// Modify the code above to visualize the Iris dataset in the preview of index.html.
// Feel free to add additional CSS properties in index.html, or using JavaScript, as you see fit.
