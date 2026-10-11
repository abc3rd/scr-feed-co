import { PGlite } from "@electric-sql/pglite";
// Execute the production service's SQL against PostgreSQL WASM, not a mocked
// catalog. PGlite serializes transactions; multi-process locking still needs
// verification against the deployment PostgreSQL server.
export async function testDatabase() {
  const db = new PGlite();
  const list = Symbol("sql-list");
  const json = Symbol("sql-json");
  const adapter = (connection) => {
    const sql = (strings, ...values) => {
      if (!strings?.raw) return { [list]: strings };
      const parameters = [];
      let query = strings[0];
      values.forEach((value, index) => {
        if (value && Object.hasOwn(value, list)) {
          query +=
            "(" +
            value[list]
              .map((item) => {
                parameters.push(item);
                return "$" + parameters.length;
              })
              .join(",") +
            ")";
        } else {
          parameters.push(
            value && Object.hasOwn(value, json)
              ? JSON.stringify(value[json])
              : value,
          );
          query += "$" + parameters.length;
        }
        query += strings[index + 1];
      });
      return connection.query(query, parameters).then((result) => result.rows);
    };
    sql.json = (value) => ({ [json]: value });
    sql.unsafe = (query) => connection.exec(query);
    sql.begin = (fn) => connection.transaction((tx) => fn(adapter(tx)));
    return sql;
  };
  return { sql: adapter(db), close: () => db.close() };
}
