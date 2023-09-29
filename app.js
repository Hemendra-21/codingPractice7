const express = require("express");
const app = express();
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
app.use(express.json());

const databasePath = path.join(__dirname, "cricketMatchDetails.db");
let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server running successfully at port 3000");
    });
  } catch (error) {
    console.log(`Database error ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertDatabaseObjToResponseObj = (databaseObject) => {
  return {
    playerId: databaseObject.player_id,
    playerName: databaseObject.player_name,
  };
};

const modifyMatchDetails = (dbResponse) => {
  return {
    matchId: dbResponse.match_id,
    match: dbResponse.match,
    year: dbResponse.year,
  };
};

// API-1 Get all players
app.get("/players/", async (request, response) => {
  const getAllPlayersQuery = `
      SELECT
        player_id as playerId,
        player_name as playerName 
      FROM
        player_details;`;

  const dbResponse = await database.all(getAllPlayersQuery);
  /*const modifiedResponse = dbResponse.map((eachItem) => {
    convertDatabaseObjToResponseObj(eachItem);
    console.log(eachItem);
  });*/
  response.send(dbResponse);
});

// API-2 Get player based on Id
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerOfIdQuery = `
      SELECT
        *
      FROM
        player_details
      WHERE 
        player_id = ${playerId};`;

  const dbResponse = await database.get(getPlayerOfIdQuery);
  response.send(convertDatabaseObjToResponseObj(dbResponse));
});

// API-3 update details of player of ID
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;

  const updateQuery = `
    UPDATE 
      player_details
    SET
      player_name = '${playerName}';`;

  await database.run(updateQuery);
  response.send("Player Details Updated");
});

// API-4 Get match details of match Id
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;

  const getDetailsQuery = `
      SELECT
        *
      FROM
        match_details
      WHERE
        match_id = ${matchId};`;
  const dbResponse = await database.get(getDetailsQuery);
  response.send(modifyMatchDetails(dbResponse));
});

// API-5 Get match details of player Id
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getAllMatchesOfPlayerQuery = `
    SELECT
      *
    FROM
      player_match_score NATURAL JOIN match_details
    WHERE 
      player_id = ${playerId};`;
  const dbResponse = await database.all(getAllMatchesOfPlayerQuery);

  const modifiedResults = dbResponse.map((eachItem) =>
    modifyMatchDetails(eachItem)
  );

  response.send(modifiedResults);
});

// API-6 Get details of player of match ID
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getPlayerDetailsQuery = `
      SELECT 
        player_id as playerId,
        player_name as playerName
      FROM
       player_match_score NATURAL JOIN  player_details
      WHERE 
        match_id = ${matchId};`;
  const dbResponse = await database.all(getPlayerDetailsQuery);
  response.send(dbResponse);
});

// API-7 Get stats
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerScored = `
    SELECT
    player_details.player_id AS playerId,
    player_details.player_name AS playerName,
    SUM(player_match_score.score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes FROM 
    player_details INNER JOIN player_match_score ON
    player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};
    `;
  const stats = await database.all(getPlayerScored);
  response.send(stats);
});

module.exports = app;
