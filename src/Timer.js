import { useState, useEffect } from "react";

const delay = 30000;
const Timer = ({ lastMoveTime }) => {
  const endTime = lastMoveTime + delay;
  const [remainingTime, setRemainingTime] = useState(endTime - Date.now());
  useEffect(() => {
    const intervalIndex = setInterval(() => {
      setRemainingTime(Math.max(endTime - Date.now(), 0));
    }, 200);
    return () => clearInterval(intervalIndex);
  });
  return <span> ({Math.floor(remainingTime / 1000)}s)</span>;
};

export default Timer;
