const DepGraph = require('dependency-graph').DepGraph;
const { isFunction } = require('lodash');
const TransactEnabled = require('./transact.extn');

// PRIVATE ATTRIBUTES
let _graph = null;
let _circular = false;

/**
 * A wrapper of DepGraph for mutual use between classes
 * @module Graph
 * @extends TransactEnabled
 */
module.exports = class Graph extends TransactEnabled {
  /**
   * Initiate a dependency graph
   * @param {boolean} [circular=false] Whether to allow circular dependencies
   * @param {boolean} [overwrite=false] Whether to overwrite current graph or skip if already existing
   */
  static init (circular = false, overwrite = false) {
    if (!(_graph instanceof DepGraph) || overwrite) {
      _graph = new DepGraph({ circular });
      _circular = circular;
    }
  }

  /**
   * Get the current graph
   * @param {boolean} [safe=true] Whether to re-initiate the graph if not available or fail the circular test
   * @param {boolean} [circularTest=false] Perform a test whether the graph has circular dependencies where not allowed
   * @returns {null|DepGraph} The graph or null if not initiated or circular where not allowed.
   * This function will always return an instance of `DepGraph` if safe is true.
   */
  static get (safe = true, circularTest = false) {
    let graph = _graph instanceof DepGraph ? _graph : null;

    // Test if the graph is circular where not allowed
    if (circularTest) {
      try {
        graph.overallOrder();
      } catch (err) {
        graph = null;
      }
    }

    if (safe && graph === null) { graph = _graph = new DepGraph({ circular: _circular }); }

    return graph;
  }

  /**
   * Filter out all the nodes that satisfy the `predicate`, i.e., a node will be filtered out if `predicate(node) === true`
   * * This function performs a circular test before removing.
   * @param {(node: string) => boolean} predicate The predicate function
   * @returns {string[]} Removed nodes
   */
  static filterBy (predicate) {
    const removedNodes = [];
    const graph = this.get(true);

    if (isFunction(predicate) && graph instanceof DepGraph) {
      graph.overallOrder().forEach((node) => {
        if (predicate(node) === true) {
          graph.removeNode(node);
          removedNodes.push(node);
        }
      });
    }

    return removedNodes;
  }

  static _getManagedState () {
    return _graph instanceof DepGraph ? _graph.clone() : null;
  }

  static _setManagedState (newState) {
    if (newState !== undefined) { _graph = newState; }
  }
};
