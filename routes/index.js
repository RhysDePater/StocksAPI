var express = require("express");
var router = express.Router();
const jwt = require("jsonwebtoken");

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});

//function to test whether an object returned is empty or not
function isEmpty(obj) {
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) return false;
  }

  return true;
}

router.get("/stocks/symbols", function (req, res, next) {
  //if the user passed an industry query, return results for that
  if (req.query.industry != null) {
    req.db
      .from("stocks")
      .select("name", "symbol", "industry")
      .where("industry", "like", "%" + req.query.industry + "%")
      .groupBy("name")
      .then((rows) => {
        if (rows.length === 0) {
          res
            .status(404)
            .json({ error: true, message: "Industry sector not found" });
        } else {
          res.status(200).json(rows);
        }
      })
      .catch((err) => {
        res
          .status(404)
          .json({ error: true, message: "Issues connecting to database" });
        console.log(err);
      });
  } else {
    //is the query object is not empty, this means they passed somthing that
    //isn't industry since that is already handled, return the appropriate error
    if (!isEmpty(req.query)) {
      res.status(400).json({
        error: true,
        message: "Invalid query parameter: only 'industry' is permitted",
      });
    } else {
      req.db
        .from("stocks")
        .select("name", "symbol", "industry")
        .groupBy("name")
        .then((rows) => {
          res.status(200).json(rows);
        })
        .catch((err) => {
          console.log(err);
          res
            .status(404)
            .json({ error: true, message: "Industry sector not found" });
        });
    }
  }
});

const authorize = (req, res, next) => {
  const authorization = req.headers.authorization;
  let token = null;
  const secretKey = "secret key";

  //retrieve token
  if (authorization && authorization.split(" ").length === 2) {
    token = authorization.split(" ")[1];
  } else {
    res.status(403).json({
      error: true,
      message: "Authorization header not found",
    });
  }

  //verify JWT and check expiration date
  try {
    const decoded = jwt.verify(token, secretKey);

    if (decoded.exp < Date.now()) {
      res.status(403).json({
        error: true,
        message: "Authorization header not found",
      });
      return;
    }

    //permit the user to advance to route
    next();
  } catch (e) {
    res.status(403).json({
      error: true,
      message: "Authorization header not found",
    });
  }
};

router.get("/stocks/authed/:symbol", authorize, function (req, res) {
  //if the user didn't pass a query, return the first result for the company
  if (isEmpty(req.query)) {
    req.db
      .from("stocks")
      .select(
        "timestamp",
        "symbol",
        "name",
        "industry",
        "open",
        "high",
        "low",
        "close",
        "volumes"
      )
      .where("symbol", "=", req.params.symbol)
      .first()
      .then((rows) => {
        if (rows.length === 0) {
          res.status(404).json({
            error: true,
            message:
              "No entries available for query symbol for supplied date range",
          });
        } else {
          res.status(200).json(rows);
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(404).json({
          error: true,
          message:
            "No entries available for query symbol for supplied date range",
        });
      });
  } else {
    //if the user queryed for a from and to
    if (req.query.from != null && req.query.to != null) {
      req.db
        .from("stocks")
        .select(
          "timestamp",
          "symbol",
          "name",
          "industry",
          "open",
          "high",
          "low",
          "close",
          "volumes"
        )
        .where("symbol", "=", req.params.symbol)
        .where("timestamp", ">=", req.query.from)
        .where("timestamp", "<=", req.query.to)
        .then((rows) => {
          if (rows.length === 0) {
            res.status(404).json({
              error: true,
              message:
                "No entries available for query symbol for supplied date range",
            });
          } else {
            res.status(200).json(rows);
          }
        })
        .catch((err) => {
          console.log(err);
          res.status(404).json({
            error: true,
            message:
              "No entries available for query symbol for supplied date range",
          });
        });
    }
    //handle when the user passes invalid queries
    else {
      res.status(400).json({
        error: true,
        message:
          "Parameters allowed are 'from' and 'to', example: /stocks/authed/AAL?from=2020-03-15",
      });
    }
  }
});

router.get("/stocks/:symbol", function (req, res, next) {
  if (isEmpty(req.query)) {
    req.db
      .from("stocks")
      .select(
        "timestamp",
        "symbol",
        "name",
        "industry",
        "open",
        "high",
        "low",
        "close",
        "volumes"
      )
      .where("symbol", "=", req.params.symbol)
      .first()
      .then((rows) => {
        if (rows.length === 0) {
          res.status(404).json({
            error: true,
            message: "No entry for symbol in stocks database",
          });
        } else {
          res.status(200).json(rows);
        }
      })
      .catch((err) => {
        console.log(err);
        res
          .status(404)
          .json({ error: true, message: "Industry sector not found" });
      });
  } else {
    res.status(400).json({
      error: true,
      message:
        "Date parameters only available on authenticated route /stocks/authed",
    });
  }
});

module.exports = router;
