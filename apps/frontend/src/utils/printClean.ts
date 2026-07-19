export function printClean() {
  const prevTitle = document.title;
  document.title = "";
  window.print();
  setTimeout(() => {
    document.title = prevTitle;
  }, 500);
}
