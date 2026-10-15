/**
 * DATA EXTRACTION
 */

const __curve = {a: -5, b: 14};
const __P = [7, 11, 19, 37, 61, 97];

let __data = {p: {}, G_o: {}, kG: {}};
let _index = 0;

__P.forEach(p => {
    let valid_points_p = find_valid_points({...__curve, p: p});
    valid_points_p.forEach(G => {
        let n;
        try {
            n = find_point_order({...__curve, p: p}, G);
        } catch (_) {
            n = null
        }
        let kG = []

        if (n !== null) {
            for (let k = 2; k <= 2*n; k++) {
                try {
                    kG.push(double_and_add({...__curve, p: p}, G, k));
                } catch (_) {
                    kG.push(null);
                }
            }
        }

        __data.p[_index] = p;
        __data.G_o[_index] = {...G, n: n};
        __data.kG[_index] = kG;
        
        _index++;
    });
});

// Save to file
const a = document.createElement("a");
a.href = URL.createObjectURL(new Blob([JSON.stringify(__data)], {type: "text/plain"}));
a.setAttribute("download", "hw1_data.json");
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
