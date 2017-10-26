
export const selectTests = [

/*
 * pre-tests

`SELECT *
FROM employee CROSS JOIN department;`,

`SELECT *
FROM employee, department;`,

`select g.*
from users u inner join groups g on g.Userid = u.Userid
where u.LastName = 'Smith'
and u.FirstName = 'John'`,

`select g.GroupName, count(g.*) as NumberOfMembers
from users u inner join groups g on g.Userid = u.Userid
group by GroupName`,

`SELECT employee.LastName, employee.DepartmentID, department.DepartmentName
FROM employee
INNER JOIN department ON
employee.DepartmentID = department.DepartmentID`,

`SELECT *
FROM employee INNER JOIN department USING (DepartmentID);`,

`SELECT *
FROM employee FULL OUTER JOIN department
  ON employee.DepartmentID = department.DepartmentID;`,

`SELECT F.EmployeeID, F.LastName, S.EmployeeID, S.LastName, F.Country
FROM Employee F INNER JOIN Employee S ON F.Country = S.Country
WHERE F.EmployeeID < S.EmployeeID
ORDER BY F.EmployeeID, S.EmployeeID;`,

`SELECT * FROM T ORDER BY C1 DESC;`,

`select g.GroupName, count(g.*) as NumberOfMembers
from users u inner join groups g on g.Userid = u.Userid
group by GroupName`,

`select g.GroupName, count(g.*) as NumberOfMembers
from users u inner join groups g on g.Userid = u.Userid
group by GroupName
having count(g.*) > 5`,

`SELECT \`loan-number\`, \`branch-name\`, amount * 100
FROM    loan`,

`SELECT DISTINCT \`loan-number\`
FROM loan
WHERE amount between 90000 and 100000`,

`SELECT P.\`P#\`, 'Weight in Grams = ', P.Weight * 454
FROM P;`,

`SELECT \`Supplier name\` = Sname , STATUS
  FROM S
  WHERE CITY = 'Paris';`,

`SELECT P.*
FROM P
WHERE P.City NOT LIKE '%E'`,

`SELECT COUNT (DISTINCT \`S#\`)
 FROM SP`,

`SELECT Sname
  FROM  S
  WHERE \`S#\` IN
    ( SELECT \`S#\`
        FROM SP
        WHERE \`P#\` = 'P_2' );`,

`SELECT Sname
  FROM S
  WHERE \`S#\` IN ('S1', 'S2', 'S3', 'S4');`,

`SELECT \`S#\`
  FROM S
  WHERE STATUS <
    ( SELECT MAX(STATUS)
      FROM S );`,
**/

// 2a)
`SELECT   S.sname
FROM      Sailors AS S, Reserves AS R
WHERE     S.sid=R.sid AND R.bid=103`,

// 2b)
`SELECT   S.sname
FROM      Sailors AS S,  Reserves AS R, Boats AS B
WHERE     S.sid=R.sid AND R.bid=B.bid AND B.color='red'`,

// 2c)
`SELECT   sname
FROM      Sailors, Boats, Reserves
WHERE     Sailors.sid=Reserves.sid AND Reserves.bid=Boats.bid AND Boats.color='red'
UNION
SELECT    sname
FROM      Sailors, Boats, Reserves
WHERE     Sailors.sid=Reserves.sid AND Reserves.bid=Boats.bid AND Boats.color='green'`,

// 2d)
`SELECT   S.sname
FROM      Sailors AS S,  Reserves AS R
WHERE     R.sid = S.sid  AND R.bid = 100 AND R.rating > 5 AND R.day = '8/9/09'`,

// 2e)
`SELECT   sname
FROM      Sailors, Boats, Reserves
WHERE     Sailors.sid=Reserves.sid AND Reserves.bid=Boats.bid AND Boats.color=’red’
INTERSECT
SELECT    sname
FROM      Sailors, Boats, Reserves
WHERE     Sailors.sid=Reserves.sid AND Reserves.bid=Boats.bid AND Boats.color=’green’`,

// 2f)
`-- illegal identifier '2color'
SELECT   S.sid
FROM      Sailors AS S,  Reserves AS R, Boats AS B
WHERE     S.sid=R.sid AND R.bid=B.bid AND B.color=‘red’
EXCEPT
SELECT    S2.sid
FROM      Sailors AS S2,  Reserves AS R2, Boats AS B2
WHERE     S2.sid=R2.sid AND R2.bid=B2.bid AND B.2color=‘green’`,

// 2g)
`SELECT   S.sname
FROM      Sailors AS S
WHERE     S.sid IN ( SELECT   R.sid
                     FROM     Reserve AS R
                     WHERE   R.bid = 103)`,

// 2h)
`SELECT   S.sname
FROM      Sailors AS S
WHERE     S.sid IN ((SELECT   R.sid
                     FROM     Reserve AS R, Boats AS B
                     WHERE   R.bid = B.bid AND B.color = ‘red’)
                    INTERSECT
                    (SELECT   R2.sid
                     FROM     Reserve AS R2, Boats AS B2
                     WHERE   R2.bid = B2.bid AND B2.color = ‘green’))`,

// 2i)
`SELECT   S.sname
FROM      Sailors AS S
WHERE     S.age > ( SELECT    MAX (S2.age)
                    FROM      Sailors S2
                    WHERE    R.sid = S2.rating = 10)`,

// 2j)
`SELECT   B.bid, Count (*) AS reservationcount
FROM      Boats B, Reserves R
WHERE     R.bid=B.bid AND B.color = ‘red’
GROUP BY  B.bid`,

// 2k)
`SELECT   B.bid, Count (*) AS reservationcount
FROM      Boats B,  Reserves R
WHERE     R.bid=B.bid AND B.color = ‘red’
GROUP BY  B.bid
HAVING    B.color = ‘red’`,

// 2l)
`-- typo "SLECT", misuse of nonstandard 'contains' WHERE predicate
SELECT    Sname
FROM      Sailors
WHERE     Sailor.sid IN (SELECT   Reserves.bid, Reserves.sid
                         FROM     Reserves
                         CONTAINS
                                  (SLECT Boats.bid
                                   FROM  Boats
                                   WHERE Boats.name  =  ‘interlake’) )`,

// 2m)
`-- Invalid TargetList
SELECT    S.rating, Ave (S.age) As average
FROM      Sailors S
WHERE     S.age > 18
GROUP BY  S.rating
HAVING    Count (*) > 1`
]
