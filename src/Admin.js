import request from "./request";
import { baseUrl } from "./config";
import { useMutation, useQueryClient } from "react-query";

const Admin = ({ moves }) => {
  const queryClient = useQueryClient();
  const search = document.location.search;
  const match = search.match(/game=(\d+)/);
  const gameIndex = match && match[1];
  const { mutateAsync: startGame } = useMutation(
    () =>
      request(`${baseUrl}/start`, {
        method: "POST",
        body: {
          gameIndex,
        },
      }),
    {
      onSuccess: () => {
        queryClient.refetchQueries("moves");
      },
    }
  );

  const { mutateAsync: submitMove } = useMutation(
    (move) =>
      request(`${baseUrl}/submitMove`, {
        method: "POST",
        body: {
          gameIndex,
          move,
        },
      }),
    {
      onSuccess: () => {
        queryClient.refetchQueries("moves");
      },
    }
  );

  if (!moves) {
    return null;
  }
  return (
    <div>
      {!moves.moves && (
        <button type="button" onClick={startGame}>
          Créer la partie
        </button>
      )}
      {moves.moves && (
        <>
          <div>Liste des coups</div>
          <ul>
            {moves.moves.map(([move, count], index) => (
              <li key={move}>
                {move} ({count}){" "}
                <button type="button" onClick={() => submitMove(move)}>
                  Valider
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default Admin;
