function handleErr(e) {
    console.log(e)
    throw e
}

async function transaction(db, queries) {
    try {
        await query(db, `BEGIN`);
        for (let i = 0; i < queries.length; i++) {
            await query(db, queries[i]);
        }
        await query(db, `COMMIT`);
    } catch (e) {
        await query(db, `ROLLBACK`);
        console.error(e)
        throw e
    }
}

async function query(db, q) {
    return await db.query(q).catch(e => handleErr(e));
}

exports.handleErr = handleErr
exports.transaction = transaction
exports.query = query
