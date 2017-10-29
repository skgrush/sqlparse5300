
export const selectTests = [

`-- Query 2a
SELECT    S.sname
FROM      Sailors AS S, Reserves AS R
WHERE     S.sid=R.sid AND R.bid=103`,

`-- Query 2b
SELECT    S.sname
FROM      Sailors AS S, Reserves AS R, Boats AS B
WHERE     S.sid=R.sid AND R.bid=B.bid AND B.color=’red’`,

`-- Query 2c
SELECT    sname
FROM      Sailors, Boats, Reserves
WHERE     Sailors.sid=Reserves.sid AND Reserves.bid=Boats.bid AND
Boats.color=’red’
UNION
SELECT    sname
FROM      Sailors, Boats, Reserves
WHERE     Sailors.sid=Reserves.sid AND Reserves.bid=Boats.bid AND
Boats.color='green'`,

`-- Query 2d (invalid)
-- unescaped reserve word 'day'
SELECT    S.sname
FROM      Sailors AS S, Reserves AS R
WHERE     R.sid = S.sid AND R.bid = 100 AND R.rating > 5 AND R.day =
‘8/9/09’`,

`-- Modified Query2d
SELECT    S.sname
FROM      Sailors AS S, Reserves AS R
WHERE     R.sid = S.sid AND R.bid = 100 AND R.rating > 5 AND R.\`day\` =
‘8/9/09’`,

`-- Query 2e
SELECT    sname
FROM      Sailors, Boats, Reserves
WHERE     Sailors.sid=Reserves.sid AND Reserves.bid=Boats.bid AND
Boats.color=’red’
INTERSECT
SELECT    sname
FROM      Sailors, Boats, Reserves
WHERE     Sailors.sid=Reserves.sid AND Reserves.bid=Boats.bid AND
Boats.color=’green’`,

`-- Query 2f (invalid)
-- illegal identifier '2color' of B
SELECT    S.sid
FROM      Sailors AS S,  Reserves AS R, Boats AS B
WHERE     S.sid=R.sid AND R.bid=B.bid AND B.color=‘red’
EXCEPT
SELECT    S2.sid
FROM      Sailors AS S2,  Reserves AS R2, Boats AS B2
WHERE     S2.sid=R2.sid AND R2.bid=B2.bid AND B.2color=‘green’`,

`-- Modified Query 2f
SELECT    S.sid
FROM      Sailors AS S,  Reserves AS R, Boats AS B
WHERE     S.sid=R.sid AND R.bid=B.bid AND B.color=‘red’
EXCEPT
SELECT    S2.sid
FROM      Sailors AS S2,  Reserves AS R2, Boats AS B2
WHERE     S2.sid=R2.sid AND R2.bid=B2.bid AND B2.color=‘green’`,

`-- Query 2g (invalid)
-- typo 'Reserve'
SELECT    S.sname
FROM      Sailors AS S
WHERE     S.sid IN ( SELECT   R.sid
                     FROM     Reserve AS R
                     WHERE   R.bid = 103)`,

`-- Modified Query 2g
SELECT    S.sname
FROM      Sailors AS S
WHERE     S.sid IN ( SELECT   R.sid
                     FROM     Reserves AS R
                     WHERE   R.bid = 103)`,

`-- Query 2h (invalid)
-- typo 'Reserve'
SELECT    S.sname
FROM      Sailors AS S
WHERE     S.sid IN ((SELECT   R.sid
                     FROM     Reserve AS R, Boats AS B
                     WHERE   R.bid = B.bid AND B.color = ‘red’)
                    INTERSECT
                    (SELECT   R2.sid
                     FROM     Reserve AS R2, Boats AS B2
                     WHERE   R2.bid = B2.bid AND B2.color = ‘green’))`,

`-- Modified Query 2h
SELECT    S.sname
FROM      Sailors AS S
WHERE     S.sid IN ((SELECT   R.sid
                     FROM     Reserves AS R, Boats AS B
                     WHERE   R.bid = B.bid AND B.color = ‘red’)
                    INTERSECT
                    (SELECT   R2.sid
                     FROM     Reserves AS R2, Boats AS B2
                     WHERE   R2.bid = B2.bid AND B2.color = ‘green’))`,

`-- Query 2i
SELECT   S.sname
FROM      Sailors AS S
WHERE     S.age > ( SELECT    MAX (S2.age)
                    FROM      Sailors S2
                    WHERE    R.sid = S2.rating = 10)`,

`-- Query 2j
SELECT   B.bid, Count (*) AS reservationcount
FROM      Boats B, Reserves R
WHERE     R.bid=B.bid AND B.color = ‘red’
GROUP BY  B.bid`,

`-- Query 2k
SELECT    B.bid, Count (*) AS reservationcount
FROM      Boats B,  Reserves R
WHERE     R.bid=B.bid AND B.color = ‘red’
GROUP BY  B.bid
HAVING    B.color = ‘red’`,

`-- Query 2l (invalid)
-- typo "SLECT", misuse of nonstandard 'contains' WHERE predicate
SELECT    Sname
FROM      Sailors
WHERE     Sailor.sid IN (SELECT   Reserves.bid, Reserves.sid
                         FROM     Reserves
                         CONTAINS
                                  (SLECT Boats.bid
                                   FROM  Boats
                                   WHERE Boats.name  =  ‘interlake’) )`,

`-- Modified Query 2l
SELECT    Sname
FROM      Sailors
WHERE     Sailor.sid IN (SELECT   Reserves.bid, Reserves.sid
                         FROM     Reserves
                         WHERE    EXISTS (
                                  SLECT Boats.bid
                                  FROM  Boats
                                  WHERE Boats.name  =  ‘interlake’
                                        AND Boats.bid = Reserves.bid ) )`,

`-- Query 2m (invalid)
-- Bad TargetList
SELECT    S.rating, Ave (S.age) As average
FROM      Sailors S
WHERE     S.age > 18
GROUP BY  S.rating
HAVING    Count (*) > 1`,

`-- Modified Query 2m
SELECT    S.rating, Avg (S.age) As average
FROM      Sailors S
WHERE     S.age > 18
GROUP BY  S.rating
HAVING    Count (*) > 1`
]
