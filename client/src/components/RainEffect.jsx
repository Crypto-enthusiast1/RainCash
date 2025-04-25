import { useEffect } from "react";

const RainEffect = () => {
   const createRainDrop = () => {
      const drop = document.createElement("div");
      drop.classList.add("rain-drop");
      const backgroundContainer = document.querySelector(".background-container");
      if (backgroundContainer) {
         backgroundContainer.appendChild(drop);
      }

      const xPosition = Math.random() * window.innerWidth;
      drop.style.left = `${xPosition}px`;

      const duration = 3 + Math.random() * 4;
      drop.style.animationDuration = `${duration}s`;

      const width = 1 + Math.random() * 2;
      drop.style.width = `${width}px`;

      const height = 20 + Math.random() * 20;
      drop.style.height = `${height}px`;

      const opacity = 0.5 + Math.random() * 0.4;
      drop.style.opacity = opacity;

      drop.addEventListener("animationend", () => {
         drop.remove();
      });
   };

   useEffect(() => {
      const rainInterval = setInterval(createRainDrop, 200);
      return () => clearInterval(rainInterval);
   }, []);

   return null;
};

export default RainEffect;