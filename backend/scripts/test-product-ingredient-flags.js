/**
 * Simulación / tests de syncProductIngredientFlags (insumos vs final).
 * Uso: node scripts/test-product-ingredient-flags.js
 */
import { syncProductIngredientFlags } from "../src/utils/productIngredientFlags.js";

let passed = 0;
let failed = 0;

function assert(name, cond, detail = "") {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

console.log("\n── Crear materia prima (raw) → debe marcar isGenericIngredient ──");
{
  const payload = { type: "raw", name: "Harina test" };
  syncProductIngredientFlags(payload);
  assert("isGenericIngredient=true", payload.isGenericIngredient === true);
  assert("genericProductId=null", payload.genericProductId === null);
}

console.log("\n── Crear final → no es genérico ──");
{
  const payload = { type: "final", name: "Quintal harina" };
  syncProductIngredientFlags(payload);
  assert("isGenericIngredient=false", payload.isGenericIngredient === false);
}

console.log("\n── Crear intermedio → no es genérico ──");
{
  const payload = { type: "intermediate", name: "Masa" };
  syncProductIngredientFlags(payload);
  assert("isGenericIngredient=false", payload.isGenericIngredient === false);
}

console.log("\n── Editar: cambiar raw → final ──");
{
  const existing = { type: "raw", genericProductId: null, isGenericIngredient: true };
  const updates = { type: "final" };
  syncProductIngredientFlags(updates, existing);
  assert("quita flag genérico", updates.isGenericIngredient === false);
}

console.log("\n── Editar: cambiar final → raw ──");
{
  const existing = { type: "final", genericProductId: null, isGenericIngredient: false };
  const updates = { type: "raw" };
  syncProductIngredientFlags(updates, existing);
  assert("marca genérico", updates.isGenericIngredient === true);
  assert("limpia enlace", updates.genericProductId === null);
}

console.log("\n── Editar solo precio (sin type): conserva raw como genérico ──");
{
  const existing = { type: "raw", genericProductId: null, isGenericIngredient: false };
  const updates = { price: 1.5 };
  syncProductIngredientFlags(updates, existing);
  assert("repara flag al editar", updates.isGenericIngredient === true);
}

console.log("\n── Presentación ya enlazada (final con genericProductId): no forzar genérico ──");
{
  const existing = { type: "final", genericProductId: 10, isGenericIngredient: false };
  const updates = { name: "Quintal x" };
  syncProductIngredientFlags(updates, existing);
  assert("sigue no-genérico", updates.isGenericIngredient === false, JSON.stringify(updates));
}

console.log("\n── Raw enlazado (estado raro): no marcar genérico ──");
{
  const existing = { type: "raw", genericProductId: 5 };
  const updates = {};
  syncProductIngredientFlags(updates, existing);
  assert("no marca genérico si está enlazado", updates.isGenericIngredient !== true);
}

console.log("\n── Label UI (simulación) ──");
{
  function typeLabel(product) {
    if (product.isGenericIngredient) return "Insumo genérico";
    if (product.type === "intermediate") return "Intermedio";
    if (product.type === "raw") return "Materia prima";
    return "Final";
  }
  assert(
    "raw sin flag ya no dice Final",
    typeLabel({ type: "raw", isGenericIngredient: false }) === "Materia prima",
  );
  assert(
    "raw con flag dice Insumo genérico",
    typeLabel({ type: "raw", isGenericIngredient: true }) === "Insumo genérico",
  );
  assert(
    "final dice Final",
    typeLabel({ type: "final", isGenericIngredient: false }) === "Final",
  );
}

console.log("\n── Filtro workbench / vínculo (simulación) ──");
{
  const products = [
    { id: 1, name: "Harina", type: "raw", isGenericIngredient: true, genericProductId: null },
    { id: 2, name: "Harina huérfana", type: "raw", isGenericIngredient: false, genericProductId: null },
    { id: 3, name: "Quintal", type: "final", isGenericIngredient: false, genericProductId: null },
    { id: 4, name: "Caja", type: "final", isGenericIngredient: false, genericProductId: 1 },
  ];

  for (const p of products) {
    if (p.type === "raw" && !p.isGenericIngredient && p.genericProductId == null) {
      p.isGenericIngredient = true;
    }
  }

  const generics = products.filter(
    (p) => p.isGenericIngredient && p.type === "raw" && p.genericProductId == null,
  );
  const presentations = products.filter((p) => p.type === "final");
  const linkTargets = products.filter(
    (p) => p.type === "final" || (p.isGenericIngredient && !p.genericProductId),
  );

  assert("genéricos incluyen huérfana reparada", generics.some((g) => g.id === 2));
  assert("presentaciones candidatas son finales", presentations.every((p) => p.type === "final"));
  assert(
    "destino de vínculo incluye insumo",
    linkTargets.some((p) => p.id === 1) && linkTargets.some((p) => p.id === 2),
  );
  assert("destino no incluye empaque como genérico", !generics.some((g) => g.id === 4));
  assert("deepEqual sanity", deepEqual({ a: 1 }, { a: 1 }));
}

console.log(`\n══ Resultado: ${passed} ok, ${failed} fallos ══\n`);
process.exit(failed ? 1 : 0);
