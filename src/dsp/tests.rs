#[cfg(test)]
mod tests {
    use super::graph::{Graph, Node};
    use super::nodes::{SourceNode, FilterNode, MixerNode, OutputNode};
    use super::resample::{resample_alpha, resample, HighQualityResampler};
    use std::collections::HashMap;

    #[test]
    fn test_graph_new() {
        let graph = Graph::new();
        assert_eq!(graph.nodes.len(), 0);
        assert_eq!(graph.edges.len(), 0);
    }

    #[test]
    fn test_add_nodes_and_edges() {
        let mut graph = Graph::new();
        let src_idx = graph.add_node(Node::Source);
        let filt_idx = graph.add_node(Node::Filter);
        let out_idx = graph.add_node(Node::Output);

        graph.add_edge(src_idx, filt_idx, None);
        graph.add_edge(filt_idx, out_idx, Some({
            let mut map = std::collections::HashMap::new();
            map.insert("cutoff".to_string(), "1000".to_string());
            map
        }));

        assert_eq!(graph.nodes.len(), 3);
        assert_eq!(graph.edges.len(), 2);
    }

    #[test]
    fn test_topo_sort() {
        let mut graph = Graph::new();
        let a = graph.add_node(Node::Source);
        let b = graph.add_node(Node::Filter);
        let c = graph.add_node(Node::Mixer);
        graph.add_edge(a, b, None);
        graph.add_edge(b, c, None);

        let order = graph.topo_sort();
        assert_eq!(order, vec![a, b, c]); // Source -> Filter -> Mixer order
    }

    #[test]
    fn test_process_returns_zero_buffer() {
        let graph = Graph::new();
        let input = vec![1.0, 2.0, 3.0];
        let output = graph.process(&input, 1.0);
        assert_eq!(output.len(), input.len());
        assert!(output.iter().all(|&x| x == 0.0));
    }

    #[test]
    fn test_source_node_new() {
        let node = SourceNode::new();
        // Keine Felder zu prüfen
    }

    #[test]
    fn test_filter_node_new() {
        let node = FilterNode::new(1000.0);
        assert_eq!(node.cutoff, 1000.0);
    }

    #[test]
    fn test_mixer_node_new() {
        let gains = vec![0.5, 1.0, 0.75];
        let node = MixerNode::new(gains);
        assert_eq!(node.gains, gains);
    }

    #[test]
    fn test_output_node_new() {
        let node = OutputNode::new();
        // Keine Felder zu prüfen
    }

    // Tests für das Resampling
    #[test]
    fn test_resample_alpha_identity() {
        let src = vec![1.0, 2.0, 3.0];
        let out = resample_alpha(1.0, &src);
        assert_eq!(out, src);
    }

    #[test]
    fn test_resample_alpha_half() {
        let src = vec![1.0, 2.0, 3.0, 4.0];
        let out = resample_alpha(0.5, &src);
        // Ausgabe darf nicht leer sein und nicht länger als das Eingabesignal (Downsampling)
        assert!(!out.is_empty());
        assert!(out.len() <= src.len());
    }

    #[test]
    fn test_resample_same_rate() {
        let src = vec![1.0, 2.0, 3.0];
        let out = resample(&src, 48000.0, 48000.0);
        assert_eq!(out, src);
    }

    #[test]
    fn test_high_quality_resampler_create() {
        let _resampler = HighQualityResampler::new(48000.0, 48000.0, 1024, 1).unwrap();
        // Erfolgreiche Erstellung reicht aus
    }

    #[test]
    fn test_high_quality_resampler_process() {
        let mut resampler = HighQualityResampler::new(48000.0, 48000.0, 1024, 1).unwrap();
        let src = vec![1.0; 1024];
        let out = resampler.resample(&src).unwrap();
        assert_eq!(out.len(), src.len());
        // Bei identischer Abtastrate sollte das Ausgabesignal dem Eingabesignal entsprechen
        assert_eq!(out, src);
    }
}