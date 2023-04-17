<script>
  import {todos} from './stores/store.js';

  let todoText = '';
  let confirmDelete = false;
  let currentIdx = -1;

  const handleTodo = () => {
    const text = todoText.trim();
    text.split(',').forEach(item => {
      $todos = [...$todos, item.trim()];
    });
    todoText = '';
  }
  const checkConfirm = (todoIdx) => {
    currentIdx = todoIdx;
    confirmDelete = true;
  }
  const handleDelete = (ok) => {
    if (ok) {
      $todos = $todos.filter((_,i) => i !== currentIdx);
    }
    confirmDelete = false;
    currentIdx = -1
  }
  const handleRemoveAll = () => {
    if (confirm("Are you sure to remove all?")) {
      $todos = [];
    }
  }
</script>

<style>
  .todo-item {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 1rem;
    border-bottom: 1px solid #999;
    margin-bottom: 0.25rem;
    padding: 0.125rem 1rem;
    align-items: center;
  }
</style>
<div class="container w-50">
  <div class="text-center my-4">
    <h2 class="my-4">Todos | <button disabled={!$todos.length} class="btn btn-rounded btn-dark" on:click={handleRemoveAll}><i class="fas fa-trash fa-1x">&nbsp;Remove all</i> </button></h2>
    <h6>(using svelte-store feature)</h6>
  </div>
  <div class="form-group">
    <div class="input-group mb-3">
      <span class="input-group-text" id="basic-addon1">Enter Todo: </span>
      <input
        type="text"
        bind:value|trim={todoText}
        class="form-control"
        placeholder="todo text...separated by comma (,) for multiple.."
        aria-label="todo item"
        aria-describedby="basic-addon1"
        on:change={handleTodo}
      />
    </div>
  </div>
  <div class="w-full">
    <div>
      {#each $todos as todo, todoIdx}
        <div class="todo-item">
          <div>{todo}</div>
          <div>
            {#if confirmDelete && currentIdx===todoIdx}
            <div>
              <button class="btn btn-floating" on:click={() => handleDelete(true)}><i class="fas fa-thumbs-up fa-2x"></i></button>
              <button class="btn btn-floating" on:click={() => handleDelete(false)}><i class="far fa-thumbs-down fa-2x"></i></button>
            </div>
            {:else}
            <button on:click={() => checkConfirm(todoIdx)} class="btn btn-warning btn-floating text-right"><i class="fas fa-times"></i></button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
