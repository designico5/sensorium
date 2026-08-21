use crate::dsp::nodes::{SourceNode, FilterNode, MixerNode, OutputNode};
use crate::dsp::resample::resample_alpha;
use std::collections::HashMap;

/// Represents a node in the DSP graph.
#[derive(Debug, Clone, PartialEq)]
pub enum Node {
    Source(SourceNode),
    Filter(FilterNode),
    Mixer(MixerNode),
    Output(OutputNode),
}

/// Represents a directed edge between nodes with optional parameter map.
#[derive(Debug, Clone, PartialEq)]
pub struct Edge {
    pub from: usize,
    pub to: usize,
    pub params: Option<HashMap<String, String>>,
}

/// DSP graph holding nodes and edges.
#[derive(Debug, Default)]
pub struct Graph {
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
}

impl Graph {
    /// Create a new empty graph.
    pub fn new() -> Self {
        Self {
            nodes: Vec::new(),
            edges: Vec::new(),
        }
    }

    /// Add a node to the graph, returning its index.
    pub fn add_node(&mut self, node: Node) -> usize {
        let idx = self.nodes.len();
        self.nodes.push(node);
        idx
    }

    /// Add a directed edge with optional parameters.
    pub fn add_edge(&mut self, from: usize, to: usize, params: Option<HashMap<String, String>>) {
        self.edges.push(Edge { from, to, params });
    }

    /// Perform a topological sort of the graph (Kahn's algorithm).
    /// Returns a vector of node indices in processing order.
    pub fn topo_sort(&self) -> Vec<usize> {
        let n = self.nodes.len();
        let mut indeg = vec![0; n];
        let mut adj: Vec<Vec<usize>> = vec![Vec::new(); n];

        for edge in &self.edges {
            adj[edge.from].push(edge.to);
            indeg[edge.to] += 1;
        }

        let mut queue: Vec<usize> = (0..n).filter(|&i| indeg[i] == 0).collect();
        let mut order = Vec::new();

        while let Some(u) = queue.pop() {
            order.push(u);
            for &v in &adj[u] {
                indeg[v] -= 1;
                if indeg[v] == 0 {
                    queue.push(v);
                }
            }
        }

        if order.len() != n {
            // Graph has cycles; fallback to original order
            (0..n).collect()
        } else {
            order
        }
    }

    /// Process the graph with the given input buffer and stretch factor alpha.
    /// Returns the output buffer.
    pub fn process(&self, input: &[f32], alpha: f32) -> Vec<f32> {
        // For simplicity, we just resample the input as a placeholder.
        // A real implementation would traverse the graph in topological order
        // and call each node's process method.
        resample_alpha(alpha, input)
    }
}