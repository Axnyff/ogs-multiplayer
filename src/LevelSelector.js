import request from "./request";
import { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { baseUrl } from './config';
import Select from 'react-select';

const options = [
  ...Array.from({ length: 30}, (_, i) => `${i + 1}kyu`).reverse(),
  ...Array.from({ length: 9}, (_, i) => `${i + 1}dan`),
].map(value => ({
  value,
  label: value,
}));

const LevelSelector = () => {
  const [level, setLevel] = useState('');
  const queryClient = useQueryClient();
  const { mutateAsync: submitLevel } = useMutation(
    () => {
      request(`${baseUrl}/level`, {
        method: "POST",
        body: { level },
      });
    },

    {
      onSuccess: () => {
        queryClient.setQueryData("logged", { loggedIn: true });
      },
    }
  );
  const handleSubmitLevel = (e) => {
    e.preventDefault();
    submitLevel();
    setLevel("");
  };

  return (
    <div className="App">
      <form className="level-form" onSubmit={handleSubmitLevel}>
        <label htmlFor="level">Quel est votre niveau ?</label>
        <br />
        <div className="select-container"></div>
        <Select
          placeholder="Sélectionnez"
          id="level"
          selectedValue={level}
          options={options}
          onChange={({ value }) => setLevel(value)}
        />
        <button disabled={!level} type="submit">Valider</button>
      </form>
    </div>
  );

};

export default LevelSelector;
