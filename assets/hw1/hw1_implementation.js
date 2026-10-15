const PlotState = {
    PLOT_NOT_LOADED: 0,
    LOADED_WAITING_SUBMIT: 1,
    SHOWING_G_CANDIDATES: 2,
    SHOWING_SCALAR_MULTIPLICATION: 3,
};

var dom_calc;
var calculator;
var implementation_form = document.querySelector("#implementation");
var form_data = {};
var latex_curve = "";
var current_plotted_G_candidates = [];
var app_state = PlotState.PLOT_NOT_LOADED;

// Initial configuration of desmos graphic calculator
function init_desmos() {    
    dom_calc = document.getElementById('calculator');
    calculator = Desmos.GraphingCalculator(dom_calc);
    
    Desmos.GraphingCalculator(dom_calc);

    // Manual customization to evade duplication
    dom_calc.querySelectorAll("div.dcg-dom-change-wrapper")[1].remove()
    dom_calc.querySelector("div.dcg-dom-change-wrapper div.dcg-exppanel-outer__wrapper").remove();
    dom_calc.querySelector("div.dcg-dom-change-wrapper div.dcg-keypad.dcg-keypad-interaction-container").remove()
    calculator.resize()

    // Event listeners/observers
    dom_calc.addEventListener("click", calculator_clicked);

    app_state = PlotState.LOADED_WAITING_SUBMIT;
}

// When interactive implementation updated: get form parameters, compute ecc and draw the result to the desmos graph
implementation_form.addEventListener("submit", function(e) {
    e.preventDefault();
    // enable k input. Necessary when trying to reset the plot by passing from g candidates after vertical line problem reached.
    document.getElementById('k').disabled = false;

    // Get form data
    const form_data_raw = Object.fromEntries(new FormData(implementation_form));
    form_data = {
        a: Number(form_data_raw["a"]),
        b: Number(form_data_raw["b"]),
        p: Number(form_data_raw["p"]),
        k: Number(form_data_raw["k"]),
        as: Number(form_data_raw["animation_speed"]),
        hl: form_data_raw['hl'] || Number(form_data_raw["k"]) > 15,
        fl: form_data_raw['fl']
    }
    
    // If feeling lucky: skip the G candidates view to the ecc plotting
    // Note: app_state not touched in this case
    if (form_data['fl']) {
        const _g_cands = find_valid_points(form_data);
        compute_ecc_plot(
            _g_cands.at(Math.floor(Math.random() * _g_cands.length))
        );
        return;
    }

    latex_curve = `y^2 = x^3 + ${form_data['a']}x + ${form_data['b']}`;
    
    // Plotting basic information
    calculator.setBlank()
    calculator.setExpression({
        id:         'curve',
        latex:      latex_curve,
        color:      "#2980b9"
    });
    // Adding G candidates
    current_plotted_G_candidates = find_valid_points(form_data);
    current_plotted_G_candidates.map(G_cand => {
        calculator.setExpression({
            id:         JSON.stringify(G_cand),
            latex:      `(${G_cand.x}, ${G_cand.y})`,
            color:      "#5ab425",
            showLabel:  false,
            labelSize:  0.01
        });
        adjust_math_bounds_if_needed(G_cand);
    });

    app_state = PlotState.SHOWING_G_CANDIDATES;
});

// Computes ecc
// param {a, b, p, xg, yg, k}
// returns the curve Public key Q
function compute_ecc(data) {
    // Algorithm for derivation
    // Ensure the curve is nonsingular.
    if ((4 * data['a'] ** 3 + 27 * data['b'] ** 2) % data['p'] === 0) {
        throw new Error("Singular elliptic curve");
    }

    let Q = double_and_add(
        {a: data['a'], b: data['b'], p: data['p']},
        {x: data["xg"], y: data["yg"]}, 
        data["k"]
    );

    return Q;
}

// Plot the ecc for a given generator G
function compute_ecc_plot(G) {
    form_data.xg = G.x; form_data.yg = G.y;
    // kG : 2G, 3G, ... kG calculation and plotting with animation
    let i = 2;
    let t = {...form_data};
    // let Qs = []

    app_state = PlotState.SHOWING_SCALAR_MULTIPLICATION;
    // First, clear the plot area from previous elements
    calculator.setBlank()
    calculator.setExpressions({
        id:         "g",
        latex:      `(${G.x}, ${G.y})`,
        color:      "#8c765a",
        showLabel:  true,
        label:      "G"
    });

    const animation_code = () => {
        // if not in the right app state, stop immediately!
        if (app_state !== PlotState.SHOWING_SCALAR_MULTIPLICATION) return;
        if (i <= form_data['k']) {
            t['k'] = i;
            Q = compute_ecc(t);
            if (Q === null) {
                alert("Oops... the calculation encountered a wall. (vertical line --> wall. Got it?). The result should be infinity. Impractical right?");
                return;
            }
        
            calculator.setExpression({
                id:         `${i}q`,
                latex:      `(${Q.x}, ${Q.y})`,
                color:      "#000",
                showLabel:  (i == form_data['k']) ? true : !form_data['hl'],
                label:      (i == form_data['k']) ? `Public Key (Q = ${i}G)` : `${i}G`
            });

            adjust_math_bounds_if_needed(Q);
        }

        // Animation terminated
        if (i >= form_data['k']) {
            update_relevant_point_texts({G: G, Q: Q});
            // subgroup order form text updated
            document.getElementById("n_res").innerText = find_point_order({
                a: form_data['a'],
                b: form_data['b'],
                p: form_data['p']
            }, G);
        } else {
            setTimeout(animation_code, form_data['as'] * 1000);
        }
        
        i++;
    }

    // Start the animation. Timeout and not interval to be able to change 'as' while animating
    setTimeout(animation_code, form_data['as'] * 1000);
}
function update_relevant_point_texts(relevant_points) {
    document.getElementById("g_res").innerText = JSON.stringify(relevant_points.G);
    document.getElementById("q_res").innerText = JSON.stringify(relevant_points.Q);
}


/**
 * Functions for ECC implementation
 */

// Point addition assuming E: y^2 = x^3 + ax + b
// Implementation of addition ( P != Q ) and doubling (P == Q)
function point_addition(curve, P, Q) {
    let R = {x: null, y: null};
    let m;
    if (P == null) return Q;
    if (Q == null) return P;
    if (P.y == 0 && Q.y == 0) return null;
    
    if (P == Q) 
        m = m_doubling(curve, P, Q) // doubling
    else
        m = m_addition(curve, P, Q); // adding
    
    m %= curve.p;
    
    R.x = (m ** 2 - P.x - Q.x) % curve.p; 
    R.y = (m * (P.x - R.x) - P.y) % curve.p;
    
    if (R.x < 0) R.x += curve.p;
    if (R.y < 0) R.y += curve.p;
    
    return R;
}
// Scalar multiplication
function double_and_add(curve, G, k) {
    let result = null;
    let addend = G;
    
    if (k < 0) {
        k = -k;
        addend = point_negation(G, curve.p);
    }
    
    while (k) {
        if (k & 1) 
            result = point_addition(curve, result, addend);
        addend = point_addition(curve, addend, addend);
        
        k >>= 1;
    }
    
    return result;
}
// end of ECC implementation


/**
 * Utility functions for ECC implementation
*/

// Negation for elliptic curves of the form E: y^2 = x^3 + ax + b
function point_negation(j, p) { return {x: j.x, y: p - j.y} }
// Modulo
function mod(a, p) {
    return ((a % p) + p) %p;
}
// Inverse modulo
function inverse_mod(a, p) {
    a = mod(a, p);

    for (let i = 1; i < p; i++)
        if (mod(a * i, p) == 1) return i;

    return null;
}
// Angular coefficient of the line for doubling operation  
function m_doubling(curve, P, Q) {
    return ((3 * P.x ** 2 + curve.a) * inverse_mod(2 * P.y, curve.p));
}
// Angular coefficient of the line for addition operation
function m_addition(curve, P, Q) {
    return ((Q.y - P.y) * inverse_mod((Q.x - P.x), curve.p));
}

// Find the valid points on the curve.
// The resulting list is composed of valid candidates for G coords
function find_valid_points(curve) {
    const points = [];
    // Map each possible square residue to its square roots.
    const roots = new Map();

    for (let y = 0; y < curve.p; y++) {
        const square = (y * y) % curve.p;

        if (!roots.has(square)) {
            roots.set(square, []);
        }

        roots.get(square).push(y);
    }

    // Find x values for which x^3 + ax + b is a square.
    for (let x = 0; x < curve.p; x++) {
        const rhs = (((x * x % curve.p) * x) % curve.p
            + (curve.a * x) % curve.p + curve.b % curve.p + 3 * curve.p) % curve.p;

        const matchingY = roots.get(rhs);

        if (matchingY) {
            for (const y of matchingY) {
                points.push({x: x, y: y});
            }
        }
    }

    return points;
}
// Find the smallest positive n such that n*G = O
// the subgroup order given G
function find_point_order(curve, G, maxOrder = 1000) {
    if (G === null) {
        return 1; // The identity point has order 1.
    }

    for (let n = 2; n <= maxOrder; n++) {
		let attempt = double_and_add(curve, G, n);
        if (attempt.x === G.x && attempt.y === G.y){
            return n - 1;       // the order is n-1, because at n the cycle already restarted.
        }
    }

    return undefined;
}

/**
 * Functions for the interactions
 */

// Adjust the math bounds to include the point, if out
function adjust_math_bounds_if_needed(P, padding = 0.22) {
    const initial_bounds = calculator.graphpaperBounds.mathCoordinates;
    let bounds = {
        top: initial_bounds.top,
        bottom: initial_bounds.bottom,
        left: initial_bounds.left,
        right: initial_bounds.right
    }

    if (P.x > bounds.right * (1-padding))  bounds.right = P.x * (1+padding);
    if (P.x < bounds.left * (1-padding))   bounds.left = P.x * (1+padding);
    if (P.y > bounds.top * (1-padding))    bounds.top = P.y * (1+padding);
    if (P.y < bounds.bottom * (1-padding)) bounds.bottom = P.y * (1+padding);

    calculator.setMathBounds(bounds);
}
function k_changed(k_el, _new) {
    // prevent multiple calls (to make this function """""atomic""""")
    k_el.disabled = true;
    _new = Number(_new);
    let _old = form_data['k'];

    
    if (app_state !== PlotState.SHOWING_SCALAR_MULTIPLICATION || _old - _new == 0) {
        k_el.disabled = false;
        return;
    }
    
    // update k (stopping the generation in case _old > _new, or pushing the finish line further away)
    form_data['k'] = _new;
    // if the previous goal was less then newest
    if (_old < _new) {
        // But, what if the generation animation has terminated and k is changed in a higher value?
        // How to know if the case?
        // Check if the kG expression is already been plotted.
        // IMPORTANT NOTE: in theory, a timely coordinated set of actions between the two animations
        // could drop this plotting. That said, I don't think it can corrupt data nor visualization state.
        // Only discard the user change input for k. 
        // The problem could be in later calls of this function: 
        // _old value could become = _new of the discarded call. With a skip that could break things.
        // Wait, also another thing: if k is updated to _new, but the points do not exist,
        // the following check could think the generation is still in progress, even if terminated.
        // Solution: "a timely coordinated set of actions" probability very low and page refresh simple and fast.
        if (calculator.getExpressions().some(exp => exp.id === `${_old}q`)) {
            let Q;
            let t = {...form_data};
            // generation has terminated. _new-_old values must be created
            // _old -= 1;      // to update previous Q point
            const point_generation_code = () => {
                if (_new > _old) {
                    t.k = _old;
                    Q = compute_ecc(t);     // this is correct because form_data['k'] is k = _new
                    if (Q === null) {
                        alert("Oops... the calculation encountered a wall. (vertical line --> wall. Got it?). The result should be infinity. Impractical right?");
                        return;
                    }

                    calculator.setExpression({
                        id:         `${_old}q`,
                        latex:      `(${Q.x},${Q.y})`,
                        color:      "#000",
                        showLabel:  !form_data['hl'],
                        label:      `${_old}G`
                    });
                }
                if (_new == _old){
                    // Creating the last point (new public key Q)
                    Q = compute_ecc(form_data);     // this is correct because form_data['k'] is k = _new
                    if (Q === null) {
                        alert("Oops... the calculation encountered a wall. (vertical line --> wall. Got it?). The result should be infinity. Impractical right?");
                        return;
                    }

                    calculator.setExpression({
                        id:         `${_new}q`,
                        latex:      `(${Q.x},${Q.y})`,
                        color:      "#000",
                        showLabel:  true,
                        label:      `Public Key (Q = ${_new}G)`
                    });
                    
                    // update the texts on the form
                    update_relevant_point_texts({
                        G: {
                            x: form_data['xg'],
                            y: form_data['yg']
                        }, 
                        Q: Q
                    });

                    k_el.disabled = false;
                } else {
                    setTimeout(point_generation_code, form_data['as'] * 1000); 
                }
                
                _old++;
            }
            // Starting point
            setTimeout(point_generation_code, form_data['as'] * 1000);
        } else {    // generation animation not yet terminated --> can safely delegate
            k_el.disabled = false;
            return;
        }
    } else {
        // actual state: _old > _new
        // Some points have to be deleted (with the animation 8-) )
        const point_reduction_code = () => {
            if (_old >= _new) calculator.removeExpression({id: `${_old}q`});
            if (_old == _new-1){            
                // update label of Q point. It is necessary to recalculate Q because not easy to recover it
                Q = compute_ecc(form_data);     // this is correct because form_data['k'] is k = _new
                if (Q === null) {
                    alert("Oops... the calculation encountered a wall. (vertical line --> wall. Got it?). The result should be infinity. Impractical right?");
                    return;
                }
                
                calculator.setExpression({
                    id:         `${_new}q`,
                    latex:      `(${Q.x},${Q.y})`,
                    color:      "#000",
                    showLabel:  true,
                    label:      `Public Key (Q = ${_new}G)`
                });
                
                // update the texts on the form
                update_relevant_point_texts({
                    G: {
                        x: form_data['xg'],
                        y: form_data['yg']
                    }, 
                    Q: Q
                });
                
                k_el.disabled = false;
            } else {
                setTimeout(point_reduction_code, form_data['as'] * 1000); 
            }
            
            _old--;
        }
        // Starting point
        setTimeout(point_reduction_code, form_data['as'] * 1000);
    }
}
function animation_speed_changed(_new) {
    form_data['as'] = _new;
}
// Find which G candidate was clicked.
// return null not clicked on a point
function detect_clicked_candidate(event) {
    const tolerance = 0.4;

    const rect = dom_calc.getBoundingClientRect();
    const click = calculator.pixelsToMath({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    });    
    const clickedPoint = current_plotted_G_candidates.find(p =>
        Math.abs(p.x - click.x) < tolerance &&
        Math.abs(p.y - click.y) < tolerance
    );
    
    return clickedPoint;
}

/** EVENT LISTENER / OBSERVER CALLBACKS */
function calculator_clicked(event) {
    if (app_state == PlotState.SHOWING_G_CANDIDATES) {
        const cc = detect_clicked_candidate(event)
        if (cc !== undefined) compute_ecc_plot(cc);
    }
}
